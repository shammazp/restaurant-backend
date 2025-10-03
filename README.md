# Restaurant Backend API

A comprehensive Node.js backend API for restaurant management with full CRUD operations for restaurants, menu items, and orders.

## Features

- **Restaurant Management**: Create, read, update, and delete restaurants
- **Menu Management**: Full CRUD operations for menu items with categories and filtering
- **Order Management**: Complete order lifecycle from creation to delivery
- **User Authentication**: JWT-based authentication system
- **Data Validation**: Comprehensive input validation and error handling
- **Search & Filtering**: Advanced search and filtering capabilities
- **Pagination**: Efficient data pagination for large datasets

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **Express Validator** - Input validation
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd restaurant-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/restaurant_db
   JWT_SECRET=your_jwt_secret_key_here
   NODE_ENV=development
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Health Check
- **GET** `/api/health` - Check API status

### Restaurants

#### Get All Restaurants
- **GET** `/api/restaurants`
- **Query Parameters:**
  - `page` (number): Page number (default: 1)
  - `limit` (number): Items per page (default: 10)
  - `cuisine` (string): Filter by cuisine type
  - `city` (string): Filter by city
  - `search` (string): Search in name and description

#### Get Restaurant by ID
- **GET** `/api/restaurants/:id`

#### Create Restaurant
- **POST** `/api/restaurants`
- **Body:**
  ```json
  {
    "name": "Restaurant Name",
    "description": "Restaurant description",
    "address": {
      "street": "123 Main St",
      "city": "City",
      "state": "State",
      "zipCode": "12345",
      "country": "USA"
    },
    "contact": {
      "phone": "+1234567890",
      "email": "contact@restaurant.com",
      "website": "https://restaurant.com"
    },
    "cuisine": ["Italian", "American"],
    "operatingHours": {
      "monday": {"open": "09:00", "close": "22:00", "closed": false}
    },
    "features": ["Delivery", "Takeout", "Dine-in"]
  }
  ```

#### Update Restaurant
- **PUT** `/api/restaurants/:id`

#### Delete Restaurant
- **DELETE** `/api/restaurants/:id`

#### Get Restaurant Menu
- **GET** `/api/restaurants/:id/menu`
- **Query Parameters:**
  - `category` (string): Filter by menu category
  - `available` (boolean): Filter by availability

### Menu Items

#### Get All Menu Items
- **GET** `/api/menu`
- **Query Parameters:**
  - `page` (number): Page number
  - `limit` (number): Items per page
  - `restaurant` (string): Filter by restaurant ID
  - `category` (string): Filter by category
  - `cuisine` (string): Filter by cuisine
  - `minPrice` (number): Minimum price filter
  - `maxPrice` (number): Maximum price filter
  - `available` (boolean): Filter by availability
  - `popular` (boolean): Filter popular items
  - `search` (string): Search in name and description

#### Get Menu Item by ID
- **GET** `/api/menu/:id`

#### Create Menu Item
- **POST** `/api/menu`
- **Body:**
  ```json
  {
    "name": "Menu Item Name",
    "description": "Item description",
    "price": 15.99,
    "category": "Main Course",
    "cuisine": "Italian",
    "ingredients": ["ingredient1", "ingredient2"],
    "allergens": ["Dairy", "Gluten"],
    "dietaryInfo": ["Vegetarian"],
    "preparationTime": 20,
    "restaurant": "restaurant_id"
  }
  ```

#### Update Menu Item
- **PUT** `/api/menu/:id`

#### Delete Menu Item
- **DELETE** `/api/menu/:id`

#### Toggle Menu Item Availability
- **PATCH** `/api/menu/:id/availability`
- **Body:**
  ```json
  {
    "isAvailable": true
  }
  ```

#### Get Categories
- **GET** `/api/menu/categories/list`

#### Get Cuisines
- **GET** `/api/menu/cuisines/list`

### Orders

#### Get All Orders
- **GET** `/api/orders`
- **Query Parameters:**
  - `page` (number): Page number
  - `limit` (number): Items per page
  - `restaurant` (string): Filter by restaurant ID
  - `status` (string): Filter by order status
  - `orderType` (string): Filter by order type
  - `startDate` (string): Filter by start date
  - `endDate` (string): Filter by end date
  - `customerEmail` (string): Filter by customer email

#### Get Order by ID
- **GET** `/api/orders/:id`

#### Create Order
- **POST** `/api/orders`
- **Body:**
  ```json
  {
    "customer": {
      "name": "Customer Name",
      "email": "customer@email.com",
      "phone": "+1234567890"
    },
    "restaurant": "restaurant_id",
    "items": [
      {
        "menuItem": "menu_item_id",
        "quantity": 2,
        "specialInstructions": "No onions"
      }
    ],
    "orderType": "delivery",
    "deliveryAddress": {
      "street": "123 Main St",
      "city": "City",
      "state": "State",
      "zipCode": "12345",
      "instructions": "Ring doorbell"
    },
    "paymentMethod": "card",
    "tip": 5.00
  }
  ```

#### Update Order Status
- **PUT** `/api/orders/:id/status`
- **Body:**
  ```json
  {
    "status": "preparing"
  }
  ```

#### Update Payment Status
- **PUT** `/api/orders/:id/payment`
- **Body:**
  ```json
  {
    "paymentStatus": "paid"
  }
  ```

#### Cancel Order
- **DELETE** `/api/orders/:id`

#### Get Customer Orders
- **GET** `/api/orders/customer/:email`

#### Get Order Statistics
- **GET** `/api/orders/stats/summary`
- **Query Parameters:**
  - `restaurant` (string): Filter by restaurant ID
  - `startDate` (string): Filter by start date
  - `endDate` (string): Filter by end date

## Data Models

### Restaurant
- Basic information (name, description, address, contact)
- Cuisine types and price range
- Operating hours and features
- Rating and images
- Owner reference

### Menu Item
- Item details (name, description, price)
- Category and cuisine classification
- Ingredients, allergens, and dietary information
- Availability and popularity flags
- Restaurant reference

### Order
- Customer information
- Order items with quantities and prices
- Order status and type (dine-in, takeout, delivery)
- Payment information
- Delivery details and timestamps

### User
- Authentication details
- Role-based access (customer, restaurant_owner, admin)
- Profile information

## Error Handling

The API uses consistent error responses:

```json
{
  "status": "error",
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message",
      "value": "invalidValue"
    }
  ]
}
```

## Response Format

All successful responses follow this format:

```json
{
  "status": "success",
  "message": "Optional success message",
  "data": {
    // Response data
  },
  "pagination": {
    // Pagination info (when applicable)
  }
}
```

## Development

### Running Tests
```bash
npm test
```

### Code Linting
```bash
npm run lint
```

### Database Seeding
```bash
npm run seed
```

## Deployment

1. Set production environment variables
2. Ensure MongoDB is accessible
3. Run `npm start` or use PM2 for process management
4. Set up reverse proxy (nginx) for production
5. Configure SSL certificates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details
