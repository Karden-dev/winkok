// src/controllers/rider.controller.js
const orderModel = require('../models/order.model');
const cashModel = require('../models/cash.model');
const cashService = require('../services/cash.service');

const getRiderOrders = async (req, res) => {
    try {
        const riderId = req.user.id;
        const filters = {
            deliverymanId: riderId,
            status: req.query.status,
            search: req.query.search,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };
        const orders = await orderModel.findForRider(filters);
        res.status(200).json(orders);
    } catch (error) {
        console.error("Erreur (GET /rider/orders):", error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des commandes.' });
    }
};

const getRiderOwedAmount = async (req, res) => {
    try {
        const { riderId } = req.params;
        const owedAmount = await cashService.getDeliverymanOwedAmount(riderId);
        res.status(200).json({ owedAmount });
    } catch (error) {
        console.error("Erreur (GET /rider/cash-owed):", error);
        res.status(500).json({ message: 'Erreur serveur lors du calcul du solde.' });
    }
};

const getRiderCashTransactions = async (req, res) => {
    try {
        const { riderId } = req.params;
        const transactions = await cashModel.findTransactionsForRider(riderId);
        res.status(200).json(transactions);
    } catch (error) {
        console.error("Erreur (GET /rider/cash-transactions):", error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des transactions.' });
    }
};

const submitRemittance = async (req, res) => {
    try {
        const riderId = req.user.id;
        const { amount, comment } = req.body;
        if (!riderId || !amount) {
            return res.status(400).json({ message: 'Le livreur et le montant sont requis.' });
        }
        await cashModel.create({
            user_id: riderId,
            type: 'remittance',
            amount: amount,
            comment: comment,
            status: 'pending'
        });
        res.status(201).json({ message: 'Versement en attente de validation par l\'administrateur.' });
    } catch (error) {
        console.error("Erreur (POST /rider/remittance):", error);
        res.status(500).json({ message: 'Erreur serveur lors de la soumission du versement.' });
    }
};

const getOrdersCounts = async (req, res) => {
    try {
        const riderId = req.user.id;
        const counts = await orderModel.getOrdersCountsForRider(riderId);
        res.status(200).json(counts);
    } catch (error) {
        console.error("Erreur (GET /rider/counts):", error);
        res.status(500).json({ message: 'Erreur lors de la récupération des compteurs.' });
    }
};

module.exports = {
  getRiderOrders,
  getRiderOwedAmount,
  getRiderCashTransactions,
  submitRemittance,
  getOrdersCounts,
};