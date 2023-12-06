interface Properties extends Record<string, unknown> {
  children: JSXFlatElement[];
}
type Component = (props?: Properties) => JSXFlatElement;
type ElementType = Component | string;
type JSXFlatElement = Fiber | null;
interface Fiber<T extends ElementType = ElementType> {
  type?: T;
  props: Properties;
  dom?: HTMLElement | Text | null;
  parent?: Fiber;
  sibling?: Fiber;
  alternate?: Fiber;
  child?: Fiber;
  effectTag?: "UPDATE" | "PLACEMENT" | "DELETION";
  hooks?: Hook[];
}
interface Hook {
  state: unknown;
  queue: HookAction[];
}

type HookAction = ((state: unknown) => unknown) | unknown;

export function createElement(
  type: ElementType,
  props: Properties | null,
  ...children: (JSXFlatElement | string | null | boolean | number)[]
): Fiber {
  const fiber: Fiber = {
    type,
    props: {
      ...props,
      children: children
        .flat()
        .filter((child) => child !== null && child !== false)
        .map((child) =>
          typeof child === "object" ? child : createTextElement(String(child))
        ),
    },
  };
  return fiber;
}

function createTextElement(text: string): Fiber {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

function createDom(fiber: Fiber<string>): HTMLElement | Text {
  const dom =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type!);

  updateDom(dom, { children: [] }, fiber.props);

  return dom;
}

const isEvent = (key: string) => key.startsWith("on");
const isProperty = (key: string) => key !== "children" && !isEvent(key);
const isNew = (prev: Properties, next: Properties) => (key: string) =>
  prev?.[key] !== next?.[key];
const isGone =
  (_prev: Properties, next: Properties | undefined) => (key: string) =>
    next && !(key in next);

function updateDom(
  dom: HTMLElement | Text,
  prevProps: Properties,
  nextProps: Properties | undefined
) {
  //Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(
      (key) =>
        !nextProps || !(key in nextProps) || isNew(prevProps, nextProps)(key)
    )
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(
        eventType,
        prevProps[name] as EventListenerOrEventListenerObject
      );
    });

  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = "";
    });
  // Set new or changed properties
  if (nextProps) {
    Object.keys(nextProps)
      .filter(isProperty)
      .filter(isNew(prevProps, nextProps))
      .forEach((name) => {
        dom[name] = nextProps[name];
      });

    // Add event listeners
    Object.keys(nextProps)
      .filter(isEvent)
      .filter(isNew(prevProps, nextProps))
      .forEach((name) => {
        const eventType = name.toLowerCase().substring(2);
        dom.addEventListener(
          eventType,
          nextProps[name] as EventListenerOrEventListenerObject
        );
      });
  }
}

function commitRoot() {
  deletions?.forEach(commitWork);
  commitWork(wipRoot?.child!);
  currentRoot = wipRoot;
  wipRoot = null;
}

function commitWork(fiber: Fiber): void {
  if (!fiber) {
    return;
  }

  let domParentFiber = fiber.parent;
  while (domParentFiber && !domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber?.dom as HTMLElement;

  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDom(
      fiber.dom as HTMLElement,
      fiber.alternate?.props || { children: [] },
      fiber.props || { children: [] }
    );
  } else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber, domParent);
  }

  commitWork(fiber.child!);
  commitWork(fiber.sibling!);
}

function commitDeletion(fiber: Fiber, domParent: HTMLElement) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child!, domParent);
  }
}

function render(element: Fiber, container: HTMLElement) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot!,
  };
  deletions = [];
  nextUnitOfWork = wipRoot;
}

let nextUnitOfWork: Fiber | null = null;
let currentRoot: Fiber | null = null;
let wipRoot: Fiber | null = null;
let deletions: Fiber[] | null = null;

const workLoop: IdleRequestCallback = (deadline) => {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork) || null;
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
};

requestIdleCallback(workLoop);

function isFunctionComponent(f: Fiber): f is Fiber<Component> {
  return f.type instanceof Function;
}

function performUnitOfWork(fiber: Fiber) {
  if (isFunctionComponent(fiber)) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber as Fiber<string>);
  }
  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber: Fiber | undefined = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}

let wipFiber: Fiber | null = null;
let hookIndex: number | null = null;

function updateFunctionComponent(fiber: Fiber<Component>) {
  wipFiber = fiber;
  hookIndex = 0;
  fiber.hooks = [];
  if (typeof fiber.type !== "function") {
    throw new Error("fiber.type is not a function");
  }
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}

function useState(initial: any) {
  if (!wipFiber || hookIndex === null) {
    throw new Error("hook not correctly initialized");
  }

  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex!];
  const hook: Hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  };

  const actions = oldHook ? oldHook.queue : [];
  // Loop over all queued actions and perform each, creating
  // a new state every time from the old state.
  // Note that actions can be a callback based on current state
  // or just a flat value
  // @todo Implement this

  const setState = (action: HookAction) => {
    hook.queue.push(action);
    if (!currentRoot) {
      throw new Error("currentRoot is null");
    }
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot!,
    };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };

  wipFiber.hooks?.push(hook);
  hookIndex++;
  return [hook.state, setState];
}

function updateHostComponent(fiber: Fiber<string>) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  reconcileChildren(fiber, fiber.props.children);
}

function reconcileChildren(wipFiber: Fiber, elements: JSXFlatElement[]) {
  let index = 0;
  let oldFiber = wipFiber.alternate?.child;
  let prevSibling: Fiber | null = null;

  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber: Fiber | null = null;

    const sameType: boolean =
      oldFiber !== undefined && !!element && element.type === oldFiber.type;

    if (oldFiber !== undefined && !!element && sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      };
    }
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: undefined,
        effectTag: "PLACEMENT",
      };
    }
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      deletions?.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      wipFiber.child = newFiber!;
    } else if (element && prevSibling) {
      prevSibling.sibling = newFiber!;
    }

    prevSibling = newFiber;
    index++;
  }
}

const Meact = { render, createElement, useState };

export default Meact;
