from flask import Flask, render_template
from database import get_db_connection

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/coffee')
def coffee():
    return render_template('coffee.html')

@app.route('/equipment')
def equipment():
    return render_template('equipment.html')

@app.route('/events')
def events():
    return render_template('events.html')

@app.route('/subscriptions')
def subscriptions():
    return render_template('subscriptions.html')

@app.route('/cart')
def cart():
    return render_template('cart.html')

@app.route('/admin')
def admin():
    return render_template('admin.html')

@app.route('/profile')
def profile():
    return render_template('profile.html')

@app.route('/orders')
def orders():
    return render_template('orders.html')

@app.route('/wishlist')
def wishlist():
    return render_template('wishlist.html')

@app.route('/my-events')
def my_events():
    return render_template('my_events.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
