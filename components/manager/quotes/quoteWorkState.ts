import type { QuoteSelectedWorkGroup } from "./QuoteWorkGroupCard";
import type { QuoteSelectedWorkItem } from "./QuoteWorkItemCard";
import type {
  QuoteCatalog,
  QuoteWorkGroup,
  QuoteWorkItemTemplate,
} from "./quoteTypes";

function mapItem(item: QuoteWorkItemTemplate): QuoteSelectedWorkItem {
  return {
    id: item.id,
    title: item.title,
    quantity: String(item.defaultQuantity),
    unitOptions: item.unitOptions,
    selectedUnit: item.unitOptions[0].unit,
    selectedUnitPrice: item.unitOptions[0].price,
    selected: false,
  };
}

function mapGroup(group: QuoteWorkGroup, index: number): QuoteSelectedWorkGroup {
  return {
    id: group.id,
    title: group.title,
    expanded: index === 0,
    items: group.items.map(mapItem),
  };
}

export function buildQuoteSelectedWorkGroups(
  catalog: QuoteCatalog,
): QuoteSelectedWorkGroup[] {
  return catalog.groups.map(mapGroup);
}

export function toggleQuoteWorkGroup(
  groups: QuoteSelectedWorkGroup[],
  groupId: string,
): QuoteSelectedWorkGroup[] {
  return groups.map((group) =>
    group.id === groupId ? { ...group, expanded: !group.expanded } : group,
  );
}

export function toggleQuoteWorkItem(
  groups: QuoteSelectedWorkGroup[],
  groupId: string,
  itemId: string,
): QuoteSelectedWorkGroup[] {
  return groups.map((group) =>
    group.id === groupId
      ? {
          ...group,
          items: group.items.map((item) =>
            item.id === itemId ? { ...item, selected: !item.selected } : item,
          ),
        }
      : group,
  );
}

export function updateQuoteWorkItemQuantity(
  groups: QuoteSelectedWorkGroup[],
  groupId: string,
  itemId: string,
  value: string,
): QuoteSelectedWorkGroup[] {
  return groups.map((group) =>
    group.id === groupId
      ? {
          ...group,
          items: group.items.map((item) =>
            item.id === itemId ? { ...item, quantity: value } : item,
          ),
        }
      : group,
  );
}

export function updateQuoteWorkItemUnit(
  groups: QuoteSelectedWorkGroup[],
  groupId: string,
  itemId: string,
  unit: string,
): QuoteSelectedWorkGroup[] {
  return groups.map((group) =>
    group.id === groupId
      ? {
          ...group,
          items: group.items.map((item) => {
            if (item.id !== itemId) return item;
            const option = item.unitOptions.find(
              (unitOption) => unitOption.unit === unit,
            );
            return option
              ? {
                  ...item,
                  selectedUnit: option.unit,
                  selectedUnitPrice: option.price,
                }
              : item;
          }),
        }
      : group,
  );
}

export function deleteQuoteWorkItem(
  groups: QuoteSelectedWorkGroup[],
  groupId: string,
  itemId: string,
): QuoteSelectedWorkGroup[] {
  return groups
    .map((group) =>
      group.id === groupId
        ? {
            ...group,
            items: group.items.filter((item) => item.id !== itemId),
          }
        : group,
    )
    .filter((group) => group.items.length > 0);
}

export function updateQuoteWorkItemDetails(
  groups: QuoteSelectedWorkGroup[],
  groupId: string,
  itemId: string,
  updates: {
    title: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    description?: string;
    estimatedHours?: string;
    scopeChecklist?: string[];
    locationMode?: "all" | "selected";
    selectedFloorNumbers?: number[];
    selectedUnitNames?: string[];
    plannedLocationKeys?: string[];
  },
): QuoteSelectedWorkGroup[] {
  const quantityValue = Number(updates.quantity) || 0;
  const unitPriceValue = Number(updates.unitPrice) || 0;
  const nextTitle = (updates.title ?? "").trim() || "";
  const nextUnit = (updates.unit ?? "").trim() || "pcs";

  return groups.map((group) =>
    group.id === groupId
      ? {
          ...group,
          items: group.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  title: nextTitle || item.title,
                  quantity: String(quantityValue),
                  unitOptions: [{ unit: nextUnit, price: unitPriceValue }],
                  selectedUnit: nextUnit,
                  selectedUnitPrice: unitPriceValue,
                  description: updates.description !== undefined ? updates.description : item.description,
                  estimatedHours: updates.estimatedHours !== undefined ? updates.estimatedHours : item.estimatedHours,
                  scopeChecklist: updates.scopeChecklist !== undefined ? updates.scopeChecklist : item.scopeChecklist,
                  locationMode: updates.locationMode !== undefined ? updates.locationMode : item.locationMode,
                  selectedFloorNumbers: updates.selectedFloorNumbers !== undefined ? updates.selectedFloorNumbers : item.selectedFloorNumbers,
                  selectedUnitNames: updates.selectedUnitNames !== undefined ? updates.selectedUnitNames : item.selectedUnitNames,
                  plannedLocationKeys: updates.plannedLocationKeys !== undefined ? updates.plannedLocationKeys : item.plannedLocationKeys,
                }
              : item,
          ),
        }
      : group,
  );
}

export function addCustomQuoteWorkItem(
  groups: QuoteSelectedWorkGroup[],
  groupId: string,
  groupTitle: string,
  itemId: string,
  customTitle: string,
  customQuantity: string,
  customUnit: string,
  customUnitPrice: string,
  extra?: {
    description?: string;
    estimatedHours?: string;
    selectedFloorNumbers?: number[];
    selectedUnitNames?: string[];
    plannedLocationKeys?: string[];
    scopeChecklist?: string[];
    locationMode?: "all" | "selected";
  },
): QuoteSelectedWorkGroup[] {
  const safeTitle = customTitle ?? "";
  const safeUnit = customUnit ?? "";
  const quantityValue = Number(customQuantity) || 1;
  const unitPriceValue = Number(customUnitPrice) || 0;
  const unitLabel = safeUnit.trim() || "pcs";
  const customItem: QuoteSelectedWorkItem = {
    id: itemId,
    title: safeTitle.trim(),
    quantity: String(quantityValue),
    unitOptions: [{ unit: unitLabel, price: unitPriceValue }],
    selectedUnit: unitLabel,
    selectedUnitPrice: unitPriceValue,
    selected: true,
    isCustom: true,
    description: extra?.description,
    estimatedHours: extra?.estimatedHours,
    selectedFloorNumbers: extra?.selectedFloorNumbers,
    selectedUnitNames: extra?.selectedUnitNames,
    plannedLocationKeys: extra?.plannedLocationKeys,
    scopeChecklist: extra?.scopeChecklist,
    locationMode:
      extra?.locationMode ||
      (extra?.plannedLocationKeys && extra.plannedLocationKeys.length > 0
        ? "selected"
        : "all"),
  };
  const targetGroup = groups.find((group) => group.id === groupId);

  if (targetGroup) {
    return groups.map((group) =>
      group.id === groupId
        ? { ...group, expanded: true, items: [...group.items, customItem] }
        : group,
    );
  }

  return [
    ...groups,
    {
      id: groupId,
      title: groupTitle,
      expanded: true,
      items: [customItem],
    },
  ];
}

export function calculateQuoteWorkTotals(groups: QuoteSelectedWorkGroup[]) {
  const subtotal = groups.reduce(
    (groupTotal, group) =>
      groupTotal +
      group.items.reduce((itemTotal, item) => {
        if (!item.selected) return itemTotal;
        return itemTotal + (Number(item.quantity) || 0) * item.selectedUnitPrice;
      }, 0),
    0,
  );

  const itemsSelected = groups.reduce(
    (total, group) => total + group.items.filter((item) => item.selected).length,
    0,
  );

  return {
    subtotal,
    itemsSelected,
  };
}
