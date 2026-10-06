CREATE DATABASE IF NOT EXISTS CoffeeWebsite;
USE CoffeeWebsite;

CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'None',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(500)
);

CREATE TABLE Events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    event_date DATETIME NOT NULL,
    description TEXT
);

CREATE TABLE Registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    FOREIGN KEY (event_id) REFERENCES Events(id) ON DELETE CASCADE
);

CREATE TABLE Orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_email VARCHAR(255) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE OrderItems (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    FOREIGN KEY (order_id) REFERENCES Orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE
);

INSERT INTO Products (name, description, category, price, image_url) VALUES 
('Ethiopian Yirgacheffe', 'Single-origin. Floral and bright with notes of jasmine and citrus.', 'Coffee', 18.00, 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?auto=format&fit=crop&w=500&q=80'),
('Colombian Supremo', 'Single-origin. Balanced and nutty with caramel sweetness.', 'Coffee', 16.00, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=500&q=80'),
('Midnight Blend', 'Unique blend. Dark and bold with dark chocolate and smoky notes.', 'Coffee', 17.50, 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=500&q=80'),
('Pro Espresso Machine', 'Commercial-grade performance for your kitchen.', 'Equipment', 850.00, '/static/images/espresso_machine.jpg'),
('Classic French Press', 'Simple and robust brewing for full-bodied coffee.', 'Equipment', 35.00, '/static/images/french_press.jpg');

INSERT INTO Events (name, event_date, description) VALUES
('Coffee Tasting Session', '2024-11-16 10:00:00', 'Experience our newest single-origin coffees.'),
('Brewing Masterclass', '2024-11-17 14:00:00', 'Learn to pour the perfect latte art.');
