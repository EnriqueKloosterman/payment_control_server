const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Factura = sequelize.define('Factura', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Unique identifier for the factura (UUID)'
    },
    factura: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Factura name/identifier cannot be empty' },
      },
      comment: 'Invoice identifier or number'
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: { msg: 'Total must be a number' },
        min: { args: [0], msg: 'Total cannot be negative' }
      },
      comment: 'Total amount of the invoice'
    },
    fecha_de_pago: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date when the invoice was paid'
    },
    fecha_de_vencimiento: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: { msg: 'Must be a valid date' }
      },
      comment: 'Due date of the invoice'
    },
    status: {
      type: DataTypes.ENUM('pendiente', 'pagada', 'vencida', 'anulada'),
      defaultValue: 'pendiente',
      allowNull: false,
      comment: 'Payment status of the invoice'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Foreign key referencing the User'
    }
  }, {
    timestamps: true, // Adds createdAt and updatedAt
    paranoid: true, // Adds deletedAt for soft deletes
    tableName: 'facturas' // explicitly define the table name
  });

  Factura.associate = (models) => {
    Factura.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return Factura;
};
