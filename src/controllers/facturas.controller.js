const { Factura, User } = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const { validationResult } = require('express-validator');
const ApiFeatures = require('../utils/apiFeatures');

/**
 * @desc    Create a new factura
 * @route   POST /api/facturas
 * @access  Private
 */
const createFactura = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', errors: errors.array() });
    }

    const { factura, total, fecha_de_pago, fecha_de_vencimiento, status } = req.body;
    const userId = req.user.id; // From protect middleware

    const newFactura = await Factura.create({
      factura,
      total,
      fecha_de_pago,
      fecha_de_vencimiento,
      status: status || 'pendiente',
      userId
    });

    res.status(201).json({
      status: 'success',
      data: newFactura
    });
  } catch (error) {
    logger.error('Create Factura Error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get all facturas for the logged in user
 * @route   GET /api/facturas
 * @access  Private
 */
const getFacturas = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year, month, ...otherQuery } = req.query;
    
    const initialWhere = { userId };
    
    if (year || month) {
      const filterYear = year ? parseInt(year, 10) : new Date().getFullYear();
      
      if (month) {
        const filterMonth = parseInt(month, 10);
        // month is 1-indexed from the frontend (1 = Jan, 12 = Dec)
        const startDate = new Date(filterYear, filterMonth - 1, 1);
        const endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59, 999);
        initialWhere.fecha_de_vencimiento = {
          [Op.between]: [startDate, endDate]
        };
      } else {
        const startDate = new Date(filterYear, 0, 1);
        const endDate = new Date(filterYear, 11, 31, 23, 59, 59, 999);
        initialWhere.fecha_de_vencimiento = {
          [Op.between]: [startDate, endDate]
        };
      }
    }
    
    const features = new ApiFeatures(Factura, otherQuery, initialWhere)
      .filter()
      .sort()
      .paginate();

    const result = await features.execute();

    res.json({
      status: 'success',
      data: {
        facturas: result.data,
        totalFacturas: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage
      }
    });
  } catch (error) {
    logger.error('Get Facturas Error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

/**
 * @desc    Get a single factura by ID
 * @route   GET /api/facturas/:id
 * @access  Private
 */
const getFacturaById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const factura = await Factura.findOne({
      where: { id, userId }
    });

    if (!factura) {
      return res.status(404).json({ status: 'error', message: 'Factura not found' });
    }

    res.json({
      status: 'success',
      data: factura
    });
  } catch (error) {
    logger.error('Get Factura By ID Error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

/**
 * @desc    Update factura status (pagado)
 * @route   PATCH /api/facturas/:id/status
 * @access  Private
 */
const updateFacturaStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', errors: errors.array() });
    }

    const { id } = req.params;
    const { status, fecha_de_pago } = req.body;
    const userId = req.user.id;

    const factura = await Factura.findOne({
      where: { id, userId }
    });

    if (!factura) {
      return res.status(404).json({ status: 'error', message: 'Factura not found' });
    }

    if (status !== undefined) {
      factura.status = status;
    }
    if (fecha_de_pago !== undefined) {
      factura.fecha_de_pago = fecha_de_pago;
    }

    await factura.save();

    res.json({
      status: 'success',
      data: factura
    });
  } catch (error) {
    logger.error('Update Factura Status Error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

/**
 * @desc    Delete a factura
 * @route   DELETE /api/facturas/:id
 * @access  Private
 */
const deleteFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const factura = await Factura.findOne({
      where: { id, userId }
    });

    if (!factura) {
      return res.status(404).json({ status: 'error', message: 'Factura not found' });
    }

    await factura.destroy();

    res.json({
      status: 'success',
      message: 'Factura deleted successfully'
    });
  } catch (error) {
    logger.error('Delete Factura Error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

/**
 * @desc    Get facturas statistics for dashboard
 * @route   GET /api/facturas/stats
 * @access  Private
 */
const getFacturasStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [totalPagado, totalPendiente, vencidasCount] = await Promise.all([
      Factura.sum('total', { where: { userId, status: 'pagada' } }),
      Factura.sum('total', { where: { userId, status: 'pendiente' } }),
      Factura.count({ where: { userId, status: 'vencida' } })
    ]);

    res.json({
      status: 'success',
      data: {
        totalPagado: totalPagado || 0,
        totalPendiente: totalPendiente || 0,
        facturasVencidas: vencidasCount || 0
      }
    });

  } catch (error) {
    logger.error('Get Facturas Stats Error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

const PDFDocument = require('pdfkit');

/**
 * @desc    Generate PDF for a factura
 * @route   GET /api/facturas/:id/pdf
 * @access  Private
 */
const generateFacturaPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const factura = await Factura.findOne({
      where: { id, userId }
    });

    if (!factura) {
      return res.status(404).json({ status: 'error', message: 'Factura not found' });
    }

    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-disposition', `attachment; filename=factura_${factura.factura}.pdf`);
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    // PDF Header
    doc
      .fontSize(20)
      .text('INVOICE / FACTURA', { align: 'center' })
      .moveDown();
      
    // Invoice Info
    doc
      .fontSize(12)
      .text(`Invoice ID: ${factura.id}`)
      .text(`Client/Concept: ${factura.factura}`)
      .moveDown();

    // Divider
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown();

    // Financial Details
    doc
      .fontSize(14)
      .text(`Total Amount: $${Number(factura.total).toFixed(2)}`, { align: 'left' })
      .text(`Status: ${factura.status.toUpperCase()}`, { align: 'left' })
      .moveDown();

    // Dates
    doc
      .fontSize(10)
      .text(`Due Date: ${factura.fecha_de_vencimiento ? new Date(factura.fecha_de_vencimiento).toLocaleDateString() : 'N/A'}`)
      .text(`Paid Date: ${factura.fecha_de_pago ? new Date(factura.fecha_de_pago).toLocaleDateString() : 'N/A'}`)
      .moveDown(2);

    // Footer
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown();
    doc
      .fontSize(10)
      .fillColor('gray')
      .text(`Generated by PayControl System - User ID: ${userId}`, { align: 'center' });

    doc.end();

  } catch (error) {
    logger.error('Generate Factura PDF Error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

/**
 * @desc    Update an entire factura (PUT)
 * @route   PUT /api/facturas/:id
 * @access  Private
 */
const updateFactura = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', errors: errors.array() });
    }

    const { id } = req.params;
    const { factura: name, total, fecha_de_vencimiento, status, fecha_de_pago } = req.body;
    const userId = req.user.id;

    const factura = await Factura.findOne({
      where: { id, userId }
    });

    if (!factura) {
      return res.status(404).json({ status: 'error', message: 'Factura not found' });
    }

    if (name !== undefined) factura.factura = name;
    if (total !== undefined) factura.total = total;
    if (fecha_de_vencimiento !== undefined) factura.fecha_de_vencimiento = fecha_de_vencimiento;
    if (status !== undefined) factura.status = status;
    if (fecha_de_pago !== undefined) factura.fecha_de_pago = fecha_de_pago;

    await factura.save();

    res.json({
      status: 'success',
      data: factura
    });
  } catch (error) {
    logger.error('Update Factura Error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

module.exports = {
  createFactura,
  getFacturas,
  getFacturaById,
  updateFactura,
  updateFacturaStatus,
  deleteFactura,
  getFacturasStats,
  generateFacturaPDF
};
