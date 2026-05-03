import { z } from "zod";

// Product Validation
export const productFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  categoryId: z.number().min(1, "Selecciona una categoría"),
  brand: z.string().min(1, "La marca es requerida").max(50),
  basePrice: z.string().refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "El precio debe ser un número positivo"
  ),
  description: z.string().optional(),
});

export type ProductFormData = z.infer<typeof productFormSchema>;

// Variant Validation
export const variantFormSchema = z.object({
  productId: z.number().min(1, "Selecciona un producto"),
  size: z.string().min(1, "La talla es requerida"),
  color: z.string().min(1, "El color es requerido"),
  stock: z.number().min(0, "El stock no puede ser negativo"),
  price: z.string().refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "El precio debe ser un número positivo"
  ),
});

export type VariantFormData = z.infer<typeof variantFormSchema>;

// Category Validation
export const categoryFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(50),
  description: z.string().max(200).optional(),
});

export type CategoryFormData = z.infer<typeof categoryFormSchema>;

// Sale Item Validation
export const saleItemSchema = z.object({
  variantId: z.number().min(1, "Selecciona una variante"),
  quantity: z.number().min(1, "La cantidad debe ser al menos 1"),
  price: z.number().min(0, "El precio no puede ser negativo"),
});

export type SaleItemData = z.infer<typeof saleItemSchema>;

// Sale Validation
export const saleFormSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Agrega al menos un artículo"),
  discount: z.number().min(0).max(100, "El descuento no puede ser mayor a 100%").optional(),
  notes: z.string().max(500).optional(),
});

export type SaleFormData = z.infer<typeof saleFormSchema>;

// Stock Adjustment Validation
export const stockAdjustmentSchema = z.object({
  variantId: z.number().min(1),
  newStock: z.number().min(0, "El stock no puede ser negativo"),
  reason: z.string().min(1, "Especifica el motivo del ajuste").max(200),
});

export type StockAdjustmentData = z.infer<typeof stockAdjustmentSchema>;

// Validation helper functions
export const validateProduct = (data: unknown) => {
  return productFormSchema.safeParse(data);
};

export const validateVariant = (data: unknown) => {
  return variantFormSchema.safeParse(data);
};

export const validateCategory = (data: unknown) => {
  return categoryFormSchema.safeParse(data);
};

export const validateSale = (data: unknown) => {
  return saleFormSchema.safeParse(data);
};

export const validateStockAdjustment = (data: unknown) => {
  return stockAdjustmentSchema.safeParse(data);
};
