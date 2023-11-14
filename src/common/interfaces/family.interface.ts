export interface FamilyInterface<Module> {
  id: string;

  parentId: string | null;

  parent?: FamilyInterface<Module> | null;

  children?: FamilyInterface<Module>[];
}

/**
 * This function groups the elements of the array in the parent/child hierarchy. It returns an array with all the
 * elements with no parent in the array, even if it theoretically has one. It also changes the original array, by adding
 * the children to their parents.
 * It works like this, because they are all connected with pointers.
 * @param groups
 */
export function initFamilyHierarchy<Module extends FamilyInterface<Module>>(
  groups: Module[],
): Module[] {
  const retVal: Module[] = [];
  for (const element of groups) {
    // if no parent
    if (!element.parentId) {
      // push it to the retVal array
      retVal.push(element);
      continue;
    }
    // try to find the parent
    const parent = groups.find((el) => el.id === element.parentId);
    // if the parent was found
    if (parent) {
      // and the child was not already append to the children
      if (
        !(parent.children ?? (parent.children = [])).some(
          (child) => child.id === element.id,
        )
      ) {
        // push it to the children array
        parent.children.push(element);
      }
    } else {
      // if the parent is not in the increment, push it to the return value
      retVal.push(element);
    }
  }
  return retVal;
}

/**
 * Leaf children first
 * @param elements
 */
export function initInverseFamilyHierarchy<
  Module extends FamilyInterface<Module>,
>(elements: Module[]): Module[] {
  const retVal: Module[] = [];
  elements.forEach((element) => {
    // search for children
    const children = elements.filter((el) => el.parentId === element.id);
    if (children.length) {
      // add parent to children
      children.forEach((child) => (child.parent = element));
    } else {
      // if no children, push to retVal
      retVal.push(element);
    }
  });
  return retVal;
}

export function teamCountOfFamily(element: FamilyInterface<any>) {
  return (
    (element.children?.length || 1) +
    (element.children ?? []).reduce((result, childElement) => {
      return result + teamCountOfFamily(childElement) - 1;
    }, 0)
  );
}

export function iterateOverFamily<Module extends FamilyInterface<Module>>(
  elements: Module[],
  callback: (value: Module, index: number, array: Module[]) => void,
  inHierarchy: boolean = true,
): void {
  let elementsHierarchy: FamilyInterface<Module>[];
  if (inHierarchy) {
    elementsHierarchy = elements.slice();
  } else {
    elementsHierarchy = initFamilyHierarchy(elements);
  }
  while (elementsHierarchy.length) {
    elementsHierarchy.forEach(callback);
    elementsHierarchy = elementsHierarchy.flatMap((parent) =>
      parent.children.filter((child) => child.children?.length),
    );
  }
}

/**
 * Leaf Children first. Have parents assigned
 * @param elements
 * @param callback
 * @param inHierarchy
 */
export function iterateOverInverseFamily<
  Module extends FamilyInterface<Module>,
>(
  elements: Module[],
  callback: (value: Module, index: number, array: Module[]) => void,
  inHierarchy: boolean = true,
): void {
  let elementsHierarchy: FamilyInterface<Module>[];
  if (inHierarchy) {
    elementsHierarchy = elements.slice();
  } else {
    elementsHierarchy = initInverseFamilyHierarchy(elements);
  }
  while (elementsHierarchy.length) {
    elementsHierarchy.forEach(callback);
    elementsHierarchy = elementsHierarchy
      .filter((child) => child.parent)
      .map((child) => child.parent);
  }
}
