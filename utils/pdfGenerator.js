// PDF Generation Utility
// Note: This is a simplified version. For production, use libraries like pdfkit or puppeteer

const generateOrderPDF = (order) => {
  // This is a template function
  // In production, use a library like pdfkit or puppeteer to generate actual PDFs
  // For now, we'll return HTML that can be printed
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Order Receipt - ${order._id.slice(-8)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .order-info {
      margin-bottom: 20px;
    }
    .order-info h2 {
      color: #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    .total {
      text-align: right;
      font-size: 18px;
      font-weight: bold;
      margin-top: 20px;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>American Pizza</h1>
    <p>Order Receipt</p>
  </div>
  
  <div class="order-info">
    <h2>Order Information</h2>
    <p><strong>Order ID:</strong> ${order._id}</p>
    <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
    <p><strong>Customer:</strong> ${order.customerName}</p>
    <p><strong>Email:</strong> ${order.customerEmail}</p>
    <p><strong>Status:</strong> ${order.orderStatus}</p>
    <p><strong>Type:</strong> ${order.deliveryType === 'pickup' ? 'Pickup' : 'Delivery'}</p>
    ${order.deliveryType === 'delivery' && order.address ? `<p><strong>Address:</strong> ${order.address}</p>` : ''}
  </div>
  
  <h2>Order Items</h2>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Quantity</th>
        <th>Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${order.items.map(item => `
        <tr>
          <td>${item.name}</td>
          <td>${item.quantity}</td>
          <td>$${item.price.toFixed(2)}</td>
          <td>$${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="total">
    ${order.deliveryCharge > 0 ? `<p>Subtotal: $${(order.totalAmount - order.deliveryCharge).toFixed(2)}</p>
    <p>Delivery Charge: $${order.deliveryCharge.toFixed(2)}</p>` : ''}
    <p>Total Amount: $${order.totalAmount.toFixed(2)}</p>
  </div>
  
  <div class="footer">
    <p>Thank you for your order!</p>
    <p>American Pizza - Bahnhof str.119, 47137 Duisburg</p>
    <p>Contact: 015213759078 | kenkeswary11@icloud.com</p>
  </div>
</body>
</html>
  `;
  
  return htmlContent;
};

const generateSalesReportPDF = (reportData) => {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Sales Report - ${reportData.period}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin: 20px 0;
    }
    .summary-card {
      border: 1px solid #ddd;
      padding: 15px;
      border-radius: 5px;
    }
    .summary-card h3 {
      margin-top: 0;
      color: #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>American Pizza</h1>
    <h2>Sales Report - ${reportData.period.toUpperCase()}</h2>
    <p>Period: ${new Date(reportData.startDate).toLocaleDateString()} to ${new Date(reportData.endDate).toLocaleDateString()}</p>
  </div>
  
  <div class="summary">
    <div class="summary-card">
      <h3>Total Sales</h3>
      <p style="font-size: 24px; font-weight: bold;">$${reportData.summary.totalSales.toFixed(2)}</p>
    </div>
    <div class="summary-card">
      <h3>Total Orders</h3>
      <p style="font-size: 24px; font-weight: bold;">${reportData.summary.totalOrders}</p>
    </div>
    <div class="summary-card">
      <h3>Average Order Value</h3>
      <p style="font-size: 24px; font-weight: bold;">$${reportData.summary.averageOrderValue.toFixed(2)}</p>
    </div>
    <div class="summary-card">
      <h3>Delivery Charges</h3>
      <p style="font-size: 24px; font-weight: bold;">$${reportData.summary.totalDeliveryCharges.toFixed(2)}</p>
    </div>
  </div>
  
  <h2>Order Status Breakdown</h2>
  <table>
    <tr>
      <th>Status</th>
      <th>Count</th>
    </tr>
    <tr><td>Pending</td><td>${reportData.summary.statusCounts.Pending}</td></tr>
    <tr><td>Preparing</td><td>${reportData.summary.statusCounts.Preparing}</td></tr>
    <tr><td>Out for Delivery</td><td>${reportData.summary.statusCounts['Out for Delivery']}</td></tr>
    <tr><td>Delivered</td><td>${reportData.summary.statusCounts.Delivered}</td></tr>
  </table>
  
  <h2>Order Details</h2>
  <table>
    <thead>
      <tr>
        <th>Order ID</th>
        <th>Customer</th>
        <th>Date</th>
        <th>Total</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${reportData.orders.map(order => `
        <tr>
          <td>${order._id.slice(-8)}</td>
          <td>${order.customerName}</td>
          <td>${new Date(order.createdAt).toLocaleString()}</td>
          <td>$${order.totalAmount.toFixed(2)}</td>
          <td>${order.orderStatus}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Generated on ${new Date().toLocaleString()}</p>
    <p>American Pizza - Sales Report</p>
  </div>
</body>
</html>
  `;
  
  return htmlContent;
};

module.exports = {
  generateOrderPDF,
  generateSalesReportPDF,
};








