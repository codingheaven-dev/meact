type Properties = Record<string, unknown> | null;
type Component = (props?: Properties) => JSXFlatElement;
type ElementType = Component | string;
type JSXElement = ComponentElement | ComponentElement[] | string | null;
type JSXFlatElement = ComponentElement | string | null;
interface ComponentElement<T extends ElementType = ElementType> {
  type: T;
  props: Properties;
  children?: JSXElement | JSXElement[];
}
interface ParsedProperty {
  key: string;
  value: string;
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
  if (typeof element.type === "string") {
    const node = document.createElement(element.type);
    const { domProps } = parseProps(element.props);
    domProps.forEach(({ key, value }) => node.setAttribute(key, value));

    const children = Array.isArray(element.children)
      ? element.children.flat()
      : element.children
      ? [element.children]
      : [];

    renderElements(children, node);
    return node;
  }

  return renderComponent(element as ComponentElement<Component>);
}

function renderComponent(element: ComponentElement<Component>): Node | null {
  // Render the custom component by invoking the type as a function.
  // Rememeber to pass the correct props to the function, including children!
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
