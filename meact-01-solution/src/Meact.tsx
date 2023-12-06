interface Properties extends Record<string, unknown> {
  children: JSXFlatElement[];
}
type JSXFlatElement = Fiber | null;
interface Fiber {
  type?: string;
  props: Properties;
  dom?: HTMLElement | Text | null;
  parent?: Fiber;
  sibling?: Fiber;
  child?: Fiber;
}

export function createElement(
  type: string,
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

function createDom(fiber: Fiber): HTMLElement | Text {
  const dom =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type!);

  updateDom(dom, { children: [] }, fiber.props);

  return dom;
}

const isProperty = (key: string) => key !== "children";
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
  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = "";
    });

  if (nextProps) {
    // Set new or changed properties
    Object.keys(nextProps)
      .filter(isProperty)
      .filter(isNew(prevProps, nextProps))
      .forEach((name) => {
        dom[name] = nextProps[name];
      });
  }
}

function commitRoot() {
  deletions?.forEach(commitWork);
  commitWork(wipRoot?.child!);
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

  if (fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  }

  commitWork(fiber.child!);
  commitWork(fiber.sibling!);
}

function render(element: Fiber, container: HTMLElement) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
  };
  deletions = [];
  nextUnitOfWork = wipRoot;
}

let nextUnitOfWork: Fiber | null = null;
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

function performUnitOfWork(fiber: Fiber) {
  updateHostComponent(fiber);
  // If it has a child, return it
  if (fiber.child) {
    return fiber.child;
  }
  // Otherwise, go to the next sibling, next uncle, next grand-uncle, etc.
  let nextFiber: Fiber | undefined = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}

function updateHostComponent(fiber: Fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  reconcileChildren(fiber, fiber.props.children);
}

function reconcileChildren(wipFiber: Fiber, children: JSXFlatElement[]) {
  let prevSibling: Fiber | null = null;

  children
    .filter((e): e is Fiber => e !== null)
    .forEach((rawFiber, index) => {
      const newFiber = {
        type: rawFiber.type,
        props: rawFiber.props,
        dom: null,
        parent: wipFiber,
      };

      const isFirst = index === 0;
      if (isFirst) {
        wipFiber.child = newFiber!;
      } else if (prevSibling) {
        prevSibling.sibling = newFiber!;
      }

      prevSibling = newFiber;
    });
}

const Meact = { render, createElement };

export default Meact;
