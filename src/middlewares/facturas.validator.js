const { body } = require('express-validator');

exports.createFacturaValidator = [
  body('factura').notEmpty().withMessage('Factura identifier is required'),
  body('total').isNumeric().withMessage('Total must be a number'),
  body('fecha_de_vencimiento').isISO8601().withMessage('Must be a valid date'),
];

exports.updateFacturaStatusValidator = [
  body('status')
    .isIn(['pendiente', 'pagada', 'vencida', 'anulada'])
    .withMessage('Status must be pendiente, pagada, vencida, or anulada')
];

exports.updateFacturaValidator = [
  body('factura').optional().notEmpty().withMessage('Factura identifier must not be empty'),
  body('total').optional().isNumeric().withMessage('Total must be a number'),
  body('fecha_de_vencimiento').optional().isISO8601().withMessage('Must be a valid date'),
  body('status').optional().isIn(['pendiente', 'pagada', 'vencida', 'anulada']).withMessage('Invalid status')
];
