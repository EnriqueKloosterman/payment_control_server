const request = require('supertest');
const app = require('../../src/app');
const { Factura, User } = require('../../src/models');
const jwt = require('jsonwebtoken');

jest.mock('../../src/models');
jest.mock('jsonwebtoken');
jest.mock('../../src/config/logger');

describe('Facturas Routes (Integration)', () => {
  let token;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'secret';
    // Let's assume a valid token string
    token = 'Bearer valid-jwt-token';
    
    // Auth Middleware mocks
    jwt.verify.mockReturnValue({ id: '550e8400-e29b-41d4-a716-446655440000' });
    User.findByPk.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440000', email: 'test@test.com' });
  });

  describe('Authentication Check', () => {
    it('should restrict access without token', async () => {
      const response = await request(app).get('/api/facturas');
      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Not authorized/i);
    });
  });

  describe('GET /api/facturas', () => {
    it('should return 200 and a list of facturas', async () => {
      Factura.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [{ id: '550e8400-e29b-41d4-a716-446655440001', factura: 'Test Factura' }]
      });

      const response = await request(app)
        .get('/api/facturas')
        .set('Authorization', token);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.facturas).toHaveLength(1);
    });
  });

  describe('POST /api/facturas', () => {
    it('should validate inputs before creating', async () => {
      const response = await request(app)
        .post('/api/facturas')
        .set('Authorization', token)
        .send({
          factura: 'F-001',
          // missing total, fecha_de_vencimiento
        });

      expect(response.status).toBe(400);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should create factura successfully', async () => {
      Factura.create.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440001',
        factura: 'F-001',
        total: 100,
        status: 'pendiente'
      });

      const response = await request(app)
        .post('/api/facturas')
        .set('Authorization', token)
        .send({
          factura: 'F-001',
          total: 100,
          fecha_de_vencimiento: '2025-01-01'
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.factura).toBe('F-001');
    });
  });
});
