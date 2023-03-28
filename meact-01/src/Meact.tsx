type Properties = Record<string, unknown> | null;
type Component = (props?: Properties) => JSXFlatElement;
type ElementType = string;
type JSXElement = ComponentElement | ComponentElement[] | string | null;
type JSXFlatElement = ComponentElement | string | null;
interface ComponentElement {
  type: ElementType;
  props: Properties;
  children?: JSXElement | JSXElement[];
}
interface ParsedProperty {
  key: string;
  value: string;
}

export function render(
  rootComponent: Component,
  domElement: HTMLElement | null
) {
  if (!domElement) return;
  renderElements([rootComponent()], domElement);
}

function convertKey(mixedCaseKey: string): string {
  // Maybe we should handle className=>class here?
  // @todo: fix this!
  return mixedCaseKey.toLowerCase();
}

function convertValue(jsxValue: unknown, domKey: string): string | null {
  switch (typeof jsxValue) {
    case "boolean":
      return jsxValue ? domKey : null;
    case "object":
      if (domKey === "style" && jsxValue) {
        // How do we convert a style object to a string for inline CSS?
        // @todo: fix this for extra points!
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

function parseProps(props: Properties): {
  domProps: ParsedProperty[];
} {
  const allProps = Object.entries(props || {});
  const domProps = allProps
    .map(convertProp)
    .filter((prop): prop is ParsedProperty => prop !== null);

  return { domProps };
}

function renderElement(element: JSXFlatElement): Node | null {
  if (
    (typeof element === "object" && !element) ||
    typeof element === "boolean"
  ) {
    return null;
  }
  if (typeof element === "string") {
    return document.createTextNode(element);
  }

  // This is where we actually create a DOM node. Make sure to add all the properties
  // returned by parseProps, and then also append all the children, using renderElements.
  // Remember that children can be an array, a single element, or nothing.
  // Pro tip: Flatten the children, to avoid issues with arrays of arrays.
  // @todo: implement this!
  return null;
}

function renderElements(elements: JSXFlatElement[], parentNode: HTMLElement) {
  // Create initial array, and insert only non-nulls as initial children
  const renderedElements: (Node | null)[] = elements.map((element, index) =>
    renderElement(element)
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
  return { type, props, children };
}

const Meact = { renderElement, createElement };

export default Meact;
