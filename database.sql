-- SQL Script para la base de datos `payment-control`

-- Crear tabla Users
CREATE TABLE IF NOT EXISTS Users (
    id CHAR(36) PRIMARY KEY, -- O UUID si es PostgreSQL
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Crear tabla facturas
CREATE TABLE IF NOT EXISTS facturas (
    id CHAR(36) PRIMARY KEY, -- O UUID si es PostgreSQL
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
    userId CHAR(36) NOT NULL, -- O UUID si es PostgreSQL
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deletedAt DATETIME DEFAULT NULL,
    CONSTRAINT fk_facturas_userId FOREIGN KEY (userId) REFERENCES Users (id) ON DELETE CASCADE
);