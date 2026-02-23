const express = require('express');
const facturasController = require('../controllers/facturas.controller');
const facturasValidator = require('../middlewares/facturas.validator');
const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

// Apply protect middleware to all factura routes
router.use(protect);

/**
 * @swagger
 * /api/facturas:
 *   post:
 *     summary: Create a new factura
 *     tags: [Facturas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - factura
 *               - total
 *               - fecha_de_vencimiento
 *             properties:
 *               factura:
 *                 type: string
 *               total:
 *                 type: number
 *               fecha_de_pago:
 *                 type: string
 *                 format: date-time
 *               fecha_de_vencimiento:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [pendiente, pagada, vencida, anulada]
 *     responses:
 *       201:
 *         description: Factura created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 */
router.post(
  '/',
  facturasValidator.createFacturaValidator,
  validate,
  facturasController.createFactura
);

/**
 * @swagger
 * /api/facturas:
 *   get:
 *     summary: Get all facturas for the logged in user
 *     tags: [Facturas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of facturas
 *       401:
 *         description: Not authorized
 */
router.get('/', facturasController.getFacturas);

/**
 * @swagger
 * /api/facturas/stats:
 *   get:
 *     summary: Get facturas statistics for dashboard
 *     tags: [Facturas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Facturas statistics
 *       401:
 *         description: Not authorized
 */
router.get('/stats', facturasController.getFacturasStats);

/**
 * @swagger
 * /api/facturas/{id}:
 *   get:
 *     summary: Get a factura by ID
 *     tags: [Facturas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Factura ID
 *     responses:
 *       200:
 *         description: Factura details
 *       404:
 *         description: Factura not found
 *       401:
 *         description: Not authorized
 */
router.get('/:id', facturasController.getFacturaById);

/**
 * @swagger
 * /api/facturas/{id}/pdf:
 *   get:
 *     summary: Export a factura as a Document
 *     tags: [Facturas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Factura ID
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Factura not found
 *       401:
 *         description: Not authorized
 */
router.get('/:id/pdf', facturasController.generateFacturaPDF);

/**
 * @swagger
 * /api/facturas/{id}/status:
 *   patch:
 *     summary: Update factura payment status
 *     tags: [Facturas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Factura ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pendiente, pagada, vencida, anulada]
 *               fecha_de_pago:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Factura updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Factura not found
 *       401:
 *         description: Not authorized
 */
router.patch(
  '/:id/status',
  facturasValidator.updateFacturaStatusValidator,
  validate,
  facturasController.updateFacturaStatus
);

/**
 * @swagger
 * /api/facturas/{id}:
 *   put:
 *     summary: Update an entire factura details
 *     tags: [Facturas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Factura ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               factura:
 *                 type: string
 *               total:
 *                 type: number
 *               fecha_de_vencimiento:
 *                 type: string
 *                 format: date-time
 *               fecha_de_pago:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [pendiente, pagada, vencida, anulada]
 *     responses:
 *       200:
 *         description: Factura updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Factura not found
 *       401:
 *         description: Not authorized
 */
router.put(
  '/:id',
  facturasValidator.updateFacturaValidator,
  validate,
  facturasController.updateFactura
);

/**
 * @swagger
 * /api/facturas/{id}:
 *   delete:
 *     summary: Delete a factura
 *     tags: [Facturas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Factura ID
 *     responses:
 *       200:
 *         description: Factura deleted successfully
 *       404:
 *         description: Factura not found
 *       401:
 *         description: Not authorized
 */
router.delete('/:id', facturasController.deleteFactura);

module.exports = router;
