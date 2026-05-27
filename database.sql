-- SQL Script para la base de datos `payment-control`

-- Crear tabla users (minúsculas para coincidir con Sequelize)
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    refreshToken VARCHAR(255) DEFAULT NULL,
    resetPasswordToken VARCHAR(255) DEFAULT NULL,
    resetPasswordExpire DATETIME DEFAULT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Crear tabla facturas
CREATE TABLE IF NOT EXISTS facturas (
    id CHAR(36) PRIMARY KEY,
    factura VARCHAR(255) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    fecha_de_pago DATETIME DEFAULT NULL,
    fecha_de_vencimiento DATETIME NOT NULL,
    status ENUM(
        'pendiente',
        'pagada',
        'vencida',
        'anulada'
    ) NOT NULL DEFAULT 'pendiente',
    userId CHAR(36) NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deletedAt DATETIME DEFAULT NULL,
    CONSTRAINT fk_facturas_userId FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
);
