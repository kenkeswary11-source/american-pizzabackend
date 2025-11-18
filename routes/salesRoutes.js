const express = require('express');
const Order = require('../models/Order');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/sales/report
// @desc    Get sales report (daily, weekly, monthly)
// @access  Private/Admin
router.get('/report', protect, admin, async (req, res) => {
  try {
    const { period = 'daily' } = req.query; // daily, weekly, monthly

    let startDate, endDate;
    const now = new Date();
    
    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    }

    const orders = await Order.find({
      createdAt: { $gte: startDate, $lt: endDate },
      paymentStatus: 'completed',
    }).populate('user', 'name email').sort({ createdAt: -1 });

    // Calculate totals
    const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = orders.length;
    const totalDeliveryCharges = orders.reduce((sum, order) => sum + (order.deliveryCharge || 0), 0);
    const pickupOrders = orders.filter(o => o.deliveryType === 'pickup').length;
    const deliveryOrders = orders.filter(o => o.deliveryType === 'delivery').length;

    // Group by status
    const statusCounts = {
      Pending: orders.filter(o => o.orderStatus === 'Pending').length,
      Preparing: orders.filter(o => o.orderStatus === 'Preparing').length,
      'Out for Delivery': orders.filter(o => o.orderStatus === 'Out for Delivery').length,
      Delivered: orders.filter(o => o.orderStatus === 'Delivered').length,
    };

    res.json({
      period,
      startDate,
      endDate,
      summary: {
        totalSales: parseFloat(totalSales.toFixed(2)),
        totalOrders,
        totalDeliveryCharges: parseFloat(totalDeliveryCharges.toFixed(2)),
        averageOrderValue: totalOrders > 0 ? parseFloat((totalSales / totalOrders).toFixed(2)) : 0,
        pickupOrders,
        deliveryOrders,
        statusCounts,
      },
      orders,
    });
  } catch (error) {
    console.error('Error fetching sales report:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/sales/stats
// @desc    Get sales statistics
// @access  Private/Admin
router.get('/stats', protect, admin, async (req, res) => {
  try {
    const now = new Date();
    
    // Today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: todayStart },
      paymentStatus: 'completed',
    });
    const todaySales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: todayStart },
          paymentStatus: 'completed',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
        },
      },
    ]);
    const todayTotal = todaySales.length > 0 ? todaySales[0].total : 0;

    // This week
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekOrders = await Order.countDocuments({
      createdAt: { $gte: weekStart },
      paymentStatus: 'completed',
    });
    const weekSales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: weekStart },
          paymentStatus: 'completed',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
        },
      },
    ]);
    const weekTotal = weekSales.length > 0 ? weekSales[0].total : 0;

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthOrders = await Order.countDocuments({
      createdAt: { $gte: monthStart },
      paymentStatus: 'completed',
    });
    const monthSales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: monthStart },
          paymentStatus: 'completed',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
        },
      },
    ]);
    const monthTotal = monthSales.length > 0 ? monthSales[0].total : 0;

    res.json({
      today: {
        orders: todayOrders,
        sales: parseFloat(todayTotal.toFixed(2)),
      },
      week: {
        orders: weekOrders,
        sales: parseFloat(weekTotal.toFixed(2)),
      },
      month: {
        orders: monthOrders,
        sales: parseFloat(monthTotal.toFixed(2)),
      },
    });
  } catch (error) {
    console.error('Error fetching sales stats:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;






