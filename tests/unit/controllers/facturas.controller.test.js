const facturasController = require('../../../src/controllers/facturas.controller');
const { Factura } = require('../../../src/models');
const logger = require('../../../src/config/logger');
const { validationResult } = require('express-validator');

jest.mock('../../../src/models');
jest.mock('../../../src/config/logger');
jest.mock('express-validator', () => ({
  validationResult: jest.fn()
}));

// Mock PDFDocument
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => ({
    pipe: jest.fn(),
    fontSize: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    moveTo: jest.fn().mockReturnThis(),
    lineTo: jest.fn().mockReturnThis(),
    stroke: jest.fn().mockReturnThis(),
    fillColor: jest.fn().mockReturnThis(),
    end: jest.fn()
  }));
});

describe('Facturas Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: 1 },
      body: {},
      params: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn()
    };
    jest.clearAllMocks();
    
    // Default validation result mock (no errors)
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });
  });

  describe('createFactura', () => {
    it('should create a new factura successfully', async () => {
      req.body = {
        factura: 'Factura 001',
        total: 1000,
        fecha_de_vencimiento: '2023-12-31'
      };

      const mockFactura = { id: 1, ...req.body, status: 'pendiente', userId: 1 };
      Factura.create.mockResolvedValue(mockFactura);

      await facturasController.createFactura(req, res);

      expect(Factura.create).toHaveBeenCalledWith(expect.objectContaining({
        factura: 'Factura 001',
        total: 1000,
        status: 'pendiente',
        userId: 1
      }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockFactura
      });
    });

    it('should return 400 if validation fails', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Error' }]
      });

      await facturasController.createFactura(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        errors: [{ msg: 'Error' }]
      });
    });
  });

  describe('getFacturas', () => {
    it('should return a list of facturas', async () => {
      Factura.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [{ id: 1, factura: 'Factura 001' }]
      });

      await facturasController.getFacturas(req, res);

      expect(Factura.findAndCountAll).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          facturas: [{ id: 1, factura: 'Factura 001' }],
          totalFacturas: 1,
          totalPages: 1,
          currentPage: 1
        }
      });
    });
  });

  describe('getFacturaById', () => {
    it('should return a factura by ID', async () => {
      req.params = { id: 1 };
      const mockFactura = { id: 1, factura: 'Factura 001' };
      Factura.findOne.mockResolvedValue(mockFactura);

      await facturasController.getFacturaById(req, res);

      expect(Factura.findOne).toHaveBeenCalledWith({ where: { id: 1, userId: 1 } });
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockFactura
      });
    });

    it('should return 404 if factura not found', async () => {
      req.params = { id: 1 };
      Factura.findOne.mockResolvedValue(null);

      await facturasController.getFacturaById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Factura not found' });
    });
  });

  describe('updateFacturaStatus', () => {
    it('should update factura status successfully', async () => {
      req.params = { id: 1 };
      req.body = { status: 'pagada' };
      
      const mockFactura = {
        id: 1,
        status: 'pendiente',
        save: jest.fn().mockResolvedValue(true)
      };
      Factura.findOne.mockResolvedValue(mockFactura);

      await facturasController.updateFacturaStatus(req, res);

      expect(mockFactura.status).toBe('pagada');
      expect(mockFactura.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockFactura
      });
    });
  });

  describe('deleteFactura', () => {
    it('should delete factura successfully', async () => {
      req.params = { id: 1 };
      
      const mockFactura = {
        id: 1,
        destroy: jest.fn().mockResolvedValue(true)
      };
      Factura.findOne.mockResolvedValue(mockFactura);

      await facturasController.deleteFactura(req, res);

      expect(mockFactura.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Factura deleted successfully'
      });
    });
  });

  describe('getFacturasStats', () => {
    it('should return facturas statistics', async () => {
      Factura.sum = jest.fn()
        .mockResolvedValueOnce(5000) // totalPagado
        .mockResolvedValueOnce(2000); // totalPendiente
      Factura.count = jest.fn().mockResolvedValue(3); // vencidasCount

      await facturasController.getFacturasStats(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          totalPagado: 5000,
          totalPendiente: 2000,
          facturasVencidas: 3
        }
      });
    });
  });
});
