type Properties = Record<string, unknown> | null;
type Component = (props?: Properties) => JSXFlatElement;
type ElementType = Component | string;
type JSXElement = ComponentElement | ComponentElement[] | string | null;
type JSXFlatElement = ComponentElement | string | null;
interface ComponentElement<T extends ElementType = ElementType> {
  type: T;
  props: Properties;
  children?: JSXElement | JSXElement[];
  states: State[];
}
interface ParsedProperty {
  key: string;
  value: string;
}
interface EventHandler {
  type: string;
  isCapture: boolean;
  callback: Function;
}
type StateUpdater<T> = (newValue: T) => void;
interface State<T = any> {
  currentValue: T;
  valueUpdater: StateUpdater<T>;
}

interface CurrentRender {
  element: ComponentElement<Component>;
  isInitial: boolean;
  updateCallback: (index: number, value: any) => void;
  index: number;
}

export function render(
  rootElement: ComponentElement,
  domElement: HTMLElement | null
) {
  if (!domElement) return;
  renderElements([rootElement], domElement);
}

function convertKey(mixedCaseKey: string): string {
  const lowerCaseKey = mixedCaseKey.toLowerCase();
  if (lowerCaseKey === "classname") {
    return "class";
  }
  return lowerCaseKey;
}

function convertValue(jsxValue: unknown, domKey: string): string | null {
  switch (typeof jsxValue) {
    case "boolean":
      return jsxValue ? domKey : null;
    case "object":
      if (domKey === "style" && jsxValue) {
        const tempNode = document.createElement("div");
        Object.entries(jsxValue).forEach(([cssKey, cssValue]) => {
          tempNode.style[cssKey] = cssValue;
        });
        return tempNode.style.cssText;
      }
    // eslint-disable-next-line no-fallthrough -- fall-through intended
    default:
      return String(jsxValue);
  }
}

function convertProp([mixedCaseKey, jsxValue]): ParsedProperty | null {
  const key = convertKey(mixedCaseKey);
  const value = convertValue(jsxValue, key);
  if (value === null) return null;
  return { key, value };
}

function convertEventHandler([onEventName, callback]: [
  string,
  unknown
]): EventHandler | null {
  if (typeof callback !== "function" || onEventName.length <= 2) {
    return null;
  }
  const isCapture = onEventName.endsWith("Capture");
  const type = onEventName.slice(2, isCapture ? -7 : undefined).toLowerCase();
  return { type, isCapture, callback };
}

function isEventListener(key: string): boolean {
  return key.startsWith("on");
}

function parseProps(props: Properties): {
  eventHandlers: EventHandler[];
  domProps: ParsedProperty[];
} {
  const allProps = Object.entries(props || {});
  const eventHandlers = allProps
    .filter(([key]) => isEventListener(key))
    .map(convertEventHandler)
    .filter((e): e is EventHandler => e !== null);
  const domProps = allProps
    .filter(([key]) => !isEventListener(key))
    .map(convertProp)
    .filter((prop): prop is ParsedProperty => prop !== null);

  return { eventHandlers, domProps };
}

function renderElement(
  element: JSXFlatElement,
  onElementUpdate: (node: Node | null) => void
): Node | null {
  if (
    (typeof element === "object" && !element) ||
    typeof element === "boolean"
  ) {
    return null;
  }
  if (typeof element === "string") {
    return document.createTextNode(element);
  }
  if (typeof element.type === "string") {
    const node = document.createElement(element.type);
    const { eventHandlers, domProps } = parseProps(element.props);
    eventHandlers.forEach(({ type, callback, isCapture }) => {
      node.addEventListener(type, callback as EventListener, isCapture);
    });
    domProps.forEach(({ key, value }) => node.setAttribute(key, value));

    const children = Array.isArray(element.children)
      ? element.children.flat()
      : element.children
      ? [element.children]
      : [];

    renderElements(children, node);
    return node;
  }

  return renderComponent(
    element as ComponentElement<Component>,
    onElementUpdate
  );
}

let currentRender: CurrentRender | null = null;
function useState<T>(initialValue: T): [T, StateUpdater<T>] {
  if (currentRender === null) {
    throw new Error(
      "Bad useState() invocation - must be invoked inside top-level of component!"
    );
  }
  const { index, isInitial } = currentRender;
  currentRender.index++;
  if (isInitial) {
    const { updateCallback } = currentRender;
    const updater: StateUpdater<T> = (newValue: T) =>
      updateCallback(index, newValue);
    const newState: State<T> = {
      currentValue: initialValue,
      valueUpdater: updater,
    };
    currentRender.element.states.push(newState);
    return [newState.currentValue, newState.valueUpdater];
  }

  const existingState = currentRender.element.states[index] as State<T>;
  if (!existingState) {
    throw new Error(
      "useState has been invoked a wrong number of times for a new render"
    );
  }
  return [existingState.currentValue, existingState.valueUpdater];
}

function renderComponent(
  element: ComponentElement<Component>,
  onElementUpdate: (node: Node | null) => void,
  isInitial = true
): Node | null {
  const updateCallback = (index: number, newValue: any) => {
    element.states[index].currentValue = newValue;
    const node = renderComponent(element, onElementUpdate, false);
    onElementUpdate(node);
  };
  currentRender = {
    element,
    isInitial,
    updateCallback,
    index: 0,
  };
  const props = { ...element.props, children: element.children };
  const jsxResult = element.type(props);
  currentRender = null;
  return renderElement(jsxResult, onElementUpdate);
}

function renderElements(elements: JSXFlatElement[], parentNode: HTMLElement) {
  const onElementUpdate = (index: number) => (newNode: Node | null) => {
    // 4 different cases, depending on whether the node existed before or not, and whether the new node exists or not.
    const oldNode = renderedElements[index];
    renderedElements[index] = newNode;
    if (oldNode !== null) {
      if (newNode === null) {
        // Remove the old element, that's it.
        parentNode.removeChild(oldNode);
        return;
      }
      // Remember the next sibling (ignore if it's null), remove the old, insert the new one
      const sibling = oldNode.nextSibling;
      parentNode.removeChild(oldNode);
      parentNode.insertBefore(newNode, sibling);
      return;
    }

    // old didn't exist, and if new is also null, ignore it all
    if (newNode === null) {
      return;
    }

    // Otherwise, find next in list that's not null, and insert before that
    // If no such sibling exists, treat as null
    const sibling = renderedElements
      .slice(index + 1)
      .find((e): e is Node => e !== null);
    parentNode.insertBefore(newNode, sibling || null);
  };

  // Create initial array, and insert only non-nulls as initial children
  const renderedElements: (Node | null)[] = elements.map((element, index) =>
    renderElement(element, onElementUpdate(index))
  );
  renderedElements
    .filter((e): e is Node => e !== null)
    .map((e) => parentNode.appendChild(e));
}

export function createElement(
  type: ElementType,
  props: Properties,
  ...children: JSXElement[]
): ComponentElement {
  return { type, props, children, states: [] };
}

const Meact = { renderElement, createElement, useState };

export default Meact;
