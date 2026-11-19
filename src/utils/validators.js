const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const createAdminSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['super_admin', 'admin', 'moderator'])
});

const createOrderSchema = z.object({
  customerId: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
    price: z.number().positive()
  })),
  totalAmount: z.number().positive(),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']).optional()
});

const createProductSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  categoryId: z.string(),
  stock: z.number().nonnegative('Stock must be non-negative').optional(),
  image: z.string().optional()
});

const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name is required'),
  description: z.string().optional(),
  image: z.string().optional()
});

const createCustomerSchema = z.object({
  name: z.string().min(2, 'Customer name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional()
});

const createNotificationSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  message: z.string().min(5, 'Message is required'),
  type: z.enum(['info', 'warning', 'success', 'error']).optional(),
  recipientId: z.string().optional()
});

const validate = (schema) => {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.validated = validated;
      next();
    } catch (error) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }
  };
};

module.exports = {
  validate,
  loginSchema,
  createAdminSchema,
  createOrderSchema,
  createProductSchema,
  createCategorySchema,
  createCustomerSchema,
  createNotificationSchema
};
