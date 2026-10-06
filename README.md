# Bean Boutique

Bean Boutique is a premium, full-stack web application designed for a specialty coffee shop. It offers a sleek and modern user interface for browsing single-origin coffees, brewing equipment, and booking tasting events. 

This project demonstrates a robust front-end experience paired with a Python Flask backend and a MySQL database foundation.

## ✨ Features

- **Product Catalog**: Browse curated single-origin coffees and premium brewing equipment.
- **Event Registration**: Sign up for coffee tasting sessions and brewing masterclasses.
- **Subscriptions**: Mock subscription flows for recurring coffee deliveries.
- **Shopping Cart**: Client-side cart management with seamless quantity adjustments and promo code support.
- **User Accounts**: Profile management, order history, wishlist, and event registrations (currently managed via `localStorage` for quick demonstration without backend auth overhead).
- **Admin Dashboard**: A secure panel interface for managing products, orders, and events.
- **Responsive Design**: Beautiful, responsive layout with modern vanilla CSS, CSS variables, and micro-animations.

## 🛠️ Tech Stack

- **Backend**: Python 3, Flask
- **Frontend**: HTML5, Vanilla JavaScript, Vanilla CSS (Custom Design System)
- **Database**: MySQL (schema provided)
- **Icons**: FontAwesome 6

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You will need the following installed on your machine:
- [Python 3.x](https://www.python.org/downloads/)
- [MySQL Server](https://dev.mysql.com/downloads/mysql/)

### Installation

1. **Clone the repository** (if applicable) or download the source code:
   ```bash
   git clone https://github.com/yourusername/coffee-website.git
   cd coffee-website
   ```

2. **Set up a virtual environment** (recommended):
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install the dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

### Database Setup

1. Open your MySQL client or command line.
2. Execute the provided SQL script to create the database, tables, and seed data:
   ```bash
   mysql -u root -p < database.sql
   ```
3. Open `database.py` and ensure the connection parameters (username, password) match your local MySQL configuration:
   ```python
   connection = mysql.connector.connect(
       host='localhost',
       user='root',       # Update this if necessary
       password='root',   # Update this if necessary
       database='CoffeeWebsite'
   )
   ```

### Running the Application

1. Start the Flask development server:
   ```bash
   python app.py
   ```
2. Open your web browser and navigate to:
   ```text
   http://127.0.0.1:5000/
   ```

## 📁 Project Structure

```
├── app.py               # Main Flask application and routes
├── database.py          # MySQL database connection logic
├── database.sql         # Database schema and initial seed data
├── requirements.txt     # Python dependencies
├── static/
│   ├── script.js        # Frontend logic (Cart, Wishlist, User State)
│   ├── style.css        # Custom design system and styles
│   └── images/          # Local image assets
└── templates/
    ├── base.html        # Master HTML layout
    ├── index.html       # Homepage
    ├── coffee.html      # Coffee catalog
    ├── equipment.html   # Equipment catalog
    ├── cart.html        # Shopping cart
    ├── profile.html     # User profile management
    └── ...              # Other page templates
```

## 📝 Notes on State Management

To allow for immediate testing and a seamless demo experience without requiring a full backend authentication system, this application currently uses the browser's `localStorage` to manage:
- Shopping Cart (`bb_cart`)
- User Session & Profile (`bb_user`)
- Wishlist (`bb_wishlist`)
- Order History (`bb_orders`)
- Event Registrations (`bb_events`)
- Active Subscriptions (`bb_subscription`)
