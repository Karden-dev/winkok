// js/orders.js

document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = 'https://app.winkexpress.online';

    // --- Références DOM ---
    const ordersTableBody = document.getElementById('ordersTableBody');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const bulkActionsDropdown = document.getElementById('bulkActionsDropdown');
    const addOrderModal = new bootstrap.Modal(document.getElementById('addOrderModal'));
    const addShopModal = new bootstrap.Modal(document.getElementById('addShopModal')); // NOUVEAU
    const editOrderModal = new bootstrap.Modal(document.getElementById('editOrderModal'));
    const statusActionModal = new bootstrap.Modal(document.getElementById('statusActionModal'));
    const assignDeliveryModal = new bootstrap.Modal(document.getElementById('assignDeliveryModal'));
    const orderDetailsModal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));

    // Correction : Création des modales pour les actions groupées
    const bulkStatusActionModal = new bootstrap.Modal(document.getElementById('bulkStatusActionModal'));
    const bulkFailedDeliveryModal = new bootstrap.Modal(document.getElementById('bulkFailedDeliveryModal'));

    const addOrderForm = document.getElementById('addOrderForm');
    const addShopForm = document.getElementById('addShopForm'); // NOUVEAU
    const editOrderForm = document.getElementById('editOrderForm');
    const failedDeliveryForm = document.getElementById('failedDeliveryForm');
    const deliveredPaymentForm = document.getElementById('deliveredPaymentForm');
    const assignDeliveryForm = document.getElementById('assignDeliveryForm');
    const deliverymanSearchInput = document.getElementById('deliverymanSearchInput');
    const deliverymanSearchResultsContainer = document.getElementById('deliverymanSearchResults');
    const assignDeliverymanIdInput = document.getElementById('assignDeliverymanId');
    const filterBtn = document.getElementById('filterBtn');
    const searchInput = document.getElementById('searchInput');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');

    const statusFilterBtn = document.getElementById('statusFilterBtn');
    const statusFilterMenu = document.getElementById('statusFilterMenu');
    let selectedStatusFilter = '';

    const bulkDeliveredPaymentForm = document.getElementById('bulkDeliveredPaymentForm');
    const bulkFailedDeliveryForm = document.getElementById('bulkFailedDeliveryForm');

    const addShopSearchInput = document.getElementById('shopSearchInput');
    const addSearchResultsContainer = document.getElementById('searchResults');
    const addSelectedShopIdInput = document.getElementById('selectedShopId');
    const itemsContainer = document.getElementById('itemsContainer');
    const addItemBtn = document.getElementById('addItemBtn');

    const editShopSearchInput = document.getElementById('editShopSearchInput');
    const editSearchResultsContainer = document.getElementById('editSearchResults');
    const editSelectedShopIdInput = document.getElementById('editSelectedShopId');
    const editItemsContainer = document.getElementById('editItemsContainer');
    const editAddItemBtn = document.getElementById('editAddItemBtn');
    const editOrderIdInput = document.getElementById('editOrderId');
    const editDeliverymanIdInput = document.getElementById('editDeliverymanId');
    const editCreatedAtInput = document.getElementById('editCreatedAt');

    const isExpeditionCheckbox = document.getElementById('isExpedition');
    const expeditionFeeContainer = document.getElementById('expeditionFeeContainer');
    const expeditionFeeInput = document.getElementById('expeditionFee');
    const editIsExpeditionCheckbox = document.getElementById('editIsExpedition');
    const editExpeditionFeeContainer = document.getElementById('editExpeditionFeeContainer');
    const editExpeditionFeeInput = document.getElementById('editExpeditionFee');

    const selectedOrdersIdsSpan = document.getElementById('selectedOrdersIds');

    let allOrders = [];
    let filteredOrders = []; // Nouvelle variable pour les commandes filtrées
    let currentPage = 1;
    let itemsPerPage = parseInt(document.getElementById('itemsPerPage').value);
    const paginationInfo = document.getElementById('paginationInfo');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const firstPageBtn = document.getElementById('firstPage');
    const lastPageBtn = document.getElementById('lastPage');
    const itemsPerPageSelect = document.getElementById('itemsPerPage');

    let shopsCache = [];
    let deliverymenCache = [];
    const CURRENT_USER_ID = 1;
    let currentOrdersToAssign = [];

    const statusTranslations = {
        'pending': 'En attente', 'in_progress': 'En cours', 'delivered': 'Livrée',
        'cancelled': 'Annulée', 'failed_delivery': 'Livraison ratée', 'reported': 'À relancer'
    };
    const paymentTranslations = {
        'pending': 'En attente', 'cash': 'En espèces', 'paid_to_supplier': 'Payé au marchand', 'cancelled': 'Annulé'
    };
    const statusColors = {
        'pending': 'status-pending', 'in_progress': 'status-in_progress', 'delivered': 'status-delivered',
        'cancelled': 'status-cancelled', 'failed_delivery': 'status-failed_delivery', 'reported': 'status-reported'
    };
    const paymentColors = {
        'pending': 'payment-pending', 'cash': 'payment-cash', 'paid_to_supplier': 'payment-supplier_paid', 'cancelled': 'payment-cancelled'
    };

    const fetchShops = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/shops?status=actif`);
            shopsCache = res.data;
        } catch (error) {
            console.error("Erreur lors du chargement des marchands:", error);
        }
    };

    const fetchDeliverymen = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/users?role=livreur&status=actif`);
            deliverymenCache = res.data;
        } catch (error) {
            console.error("Erreur lors du chargement des livreurs:", error);
        }
    };

    const showNotification = (message, type = 'success') => {
        const container = document.getElementById('notification-container');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.role = 'alert';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        container.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    };

    const showLoading = (element) => {
        element.innerHTML = '<tr><td colspan="12" class="text-center p-4"><div class="spinner-border text-corail" role="status"><span class="visually-hidden">Chargement...</span></div></td></tr>';
    };

    const fetchAllData = async () => {
        showLoading(ordersTableBody);
        try {
            const ordersRes = await axios.get(`${API_BASE_URL}/orders`);
            allOrders = ordersRes.data;
            applyFilters(); // Applique les filtres après le chargement initial
        } catch (error) {
            console.error("Erreur lors de la récupération des données:", error);
            ordersTableBody.innerHTML = `<tr><td colspan="12" class="text-center text-danger p-4">Erreur lors du chargement des données.</td></tr>`;
        }
    };

    const applyFilters = () => {
        const searchText = searchInput.value.toLowerCase();
        const startDate = startDateFilter.value;
        const endDate = endDateFilter.value;
        const status = selectedStatusFilter;

        filteredOrders = allOrders.filter(order => {
            const orderDate = new Date(order.created_at).toISOString().slice(0, 10);
            const isDateMatch = (!startDate || orderDate >= startDate) && (!endDate || orderDate <= endDate);
            const isStatusMatch = !status || order.status === status;

            const searchableFields = [
                order.customer_name?.toLowerCase(),
                order.customer_phone?.toLowerCase(),
                order.delivery_location?.toLowerCase(),
                order.shop_name?.toLowerCase(),
                order.deliveryman_name?.toLowerCase(),
                order.id.toString(),
            ];
            const isTextMatch = !searchText || searchableFields.some(field => field?.includes(searchText));

            return isDateMatch && isStatusMatch && isTextMatch;
        });

        currentPage = 1; // Réinitialise à la première page après un nouveau filtre
        renderOrdersTable(filteredOrders);
    };

    const renderOrdersTable = (orders) => {
        ordersTableBody.innerHTML = '';
        if (!orders || orders.length === 0) {
            ordersTableBody.innerHTML = `<tr><td colspan="12" class="text-center p-3">Aucune commande trouvée.</td></tr>`;
            updatePaginationControls(0);
            return;
        }

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedItems = orders.slice(start, end);

        paginatedItems.forEach(order => {
            const row = document.createElement('tr');
            const totalArticleAmount = parseFloat(order.article_amount || 0);
            const deliveryFee = parseFloat(order.delivery_fee || 0);
            const deliverymanName = order.deliveryman_name || 'Non assigné';
            const shopName = order.shop_name || 'N/A';

            let payoutAmount = 0;
            if (order.status === 'delivered') {
                if (order.payment_status === 'cash') {
                    payoutAmount = totalArticleAmount - deliveryFee;
                } else if (order.payment_status === 'paid_to_supplier') {
                    payoutAmount = -deliveryFee;
                }
            } else if (order.status === 'failed_delivery') {
                const amountReceived = parseFloat(order.amount_received || 0);
                payoutAmount = amountReceived - deliveryFee;
            } else {
                payoutAmount = 0;
            }

            const displayStatus = statusTranslations[order.status] || 'Non spécifié';
            const displayPaymentStatus = paymentTranslations[order.payment_status] || 'Non spécifié';
            const statusClass = statusColors[order.status] || 'bg-secondary text-white';
            const paymentClass = paymentColors[order.payment_status] || 'bg-secondary text-white';

            const itemTooltip = order.items && order.items.length > 0
                ? order.items.map(item => `Article: ${item.quantity} x ${item.item_name}<br>Montant: ${item.amount.toLocaleString('fr-FR')} FCFA`).join('<br>')
                : 'N/A';

            row.innerHTML = `
                <td><input type="checkbox" class="order-checkbox" data-order-id="${order.id}"></td>
                <td>${shopName}</td>
                <td><span data-bs-toggle="tooltip" data-bs-html="true" title="Client: ${order.customer_name || 'N/A'}">${order.customer_phone}</span></td>
                <td>${order.delivery_location}</td>
                <td><span data-bs-toggle="tooltip" data-bs-html="true" title="${itemTooltip}">${order.items && order.items.length > 0 ? order.items[0].item_name : 'N/A'}</span></td>
                <td>${totalArticleAmount.toLocaleString('fr-FR')} FCFA</td>
                <td>${deliveryFee.toLocaleString('fr-FR')} FCFA</td>
                <td>${payoutAmount.toLocaleString('fr-FR')} FCFA</td>
                <td><div class="payment-container"><i class="bi bi-circle-fill ${paymentClass}"></i>${displayPaymentStatus}</div></td>
                <td><div class="status-container"><i class="bi bi-circle-fill ${statusClass}"></i>${displayStatus}</div></td>
                <td>${deliverymanName}</td>
                <td>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false"><i class="bi bi-gear"></i></button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item details-btn" href="#" data-order-id="${order.id}"><i class="bi bi-eye"></i> Afficher les détails</a></li>
                            <li><a class="dropdown-item edit-btn" href="#" data-order-id="${order.id}"><i class="bi bi-pencil"></i> Modifier</a></li>
                            <li><a class="dropdown-item assign-btn" href="#" data-order-id="${order.id}"><i class="bi bi-person"></i> Assigner</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item status-delivered-btn" href="#" data-order-id="${order.id}"><i class="bi bi-check-circle"></i> Livrée</a></li>
                            <li><a class="dropdown-item status-failed-btn" href="#" data-order-id="${order.id}"><i class="bi bi-x-circle"></i> Livraison ratée</a></li>
                            <li><a class="dropdown-item status-reported-btn" href="#" data-order-id="${order.id}"><i class="bi bi-clock"></i> À relancer</a></li>
                            <li><a class="dropdown-item status-cancelled-btn" href="#" data-order-id="${order.id}"><i class="bi bi-slash-circle"></i> Annulée</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item delete-btn text-danger" href="#" data-order-id="${order.id}"><i class="bi bi-trash"></i> Supprimer</a></li>
                        </ul>
                    </div>
                </td>
                `;
            ordersTableBody.appendChild(row);
        });

        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function(tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
        updatePaginationControls(orders.length);
    };
    
    // NOUVELLE FONCTION pour mettre à jour les contrôles de pagination
    const updatePaginationControls = (totalOrders) => {
        const totalPages = Math.ceil(totalOrders / itemsPerPage);
        paginationInfo.textContent = `Page ${currentPage} de ${totalPages} (${totalOrders} commandes)`;
        
        firstPageBtn.classList.toggle('disabled', currentPage === 1);
        prevPageBtn.classList.toggle('disabled', currentPage === 1);
        nextPageBtn.classList.toggle('disabled', currentPage === totalPages || totalOrders === 0);
        lastPageBtn.classList.toggle('disabled', currentPage === totalPages || totalOrders === 0);
        
        document.getElementById('currentPageDisplay').textContent = currentPage;
    };

    // NOUVEAUX GESTIONNAIRES d'événements pour la pagination
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderOrdersTable(filteredOrders);
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if (currentPage < Math.ceil(filteredOrders.length / itemsPerPage)) {
            currentPage++;
            renderOrdersTable(filteredOrders);
        }
    });

    firstPageBtn.addEventListener('click', () => {
        currentPage = 1;
        renderOrdersTable(filteredOrders);
    });

    lastPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
        currentPage = totalPages;
        renderOrdersTable(filteredOrders);
    });

    itemsPerPageSelect.addEventListener('change', (e) => {
        itemsPerPage = parseInt(e.target.value);
        currentPage = 1; // Réinitialise à la première page après avoir changé le nombre d'éléments
        renderOrdersTable(filteredOrders);
    });
    
    const addItemRow = (container, item = {}) => {
        const itemRow = document.createElement('div');
        itemRow.className = 'row g-2 item-row mb-2';
        const nameId = `itemName-${Date.now()}`;
        const quantityId = `itemQuantity-${Date.now()}`;
        const amountId = `itemAmount-${Date.now()}`;

        itemRow.innerHTML = `
            <div class="col-md-5">
                <label for="${nameId}" class="form-label mb-1">Nom article</label>
                <input type="text" class="form-control form-control-sm item-name-input" id="${nameId}" value="${item.item_name || ''}" placeholder="Ex: T-shirt" required>
            </div>
            <div class="col-md-3">
                <label for="${quantityId}" class="form-label mb-1">Qté</label>
                <input type="number" class="form-control form-control-sm item-quantity-input" id="${quantityId}" value="${item.quantity || 1}" min="1" required>
            </div>
            <div class="col-md-4">
                <label for="${amountId}" class="form-label mb-1">Montant</label>
                <div class="input-group input-group-sm">
                    <input type="number" class="form-control item-amount-input" id="${amountId}" value="${item.amount || 0}" min="0" required>
                    <button class="btn btn-outline-danger remove-item-btn" type="button"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        `;
        container.appendChild(itemRow);

        if (container.children.length > 1) {
            itemRow.querySelectorAll('label').forEach(label => label.classList.add('visually-hidden'));
        }
    };

    const handleRemoveItem = (container) => {
        container.addEventListener('click', (e) => {
            if (e.target.closest('.remove-item-btn') && container.children.length > 1) {
                e.target.closest('.item-row').remove();
            }
        });
    };

    if (isExpeditionCheckbox) {
        isExpeditionCheckbox.addEventListener('change', () => {
            if (isExpeditionCheckbox.checked) {
                expeditionFeeContainer.style.display = 'block';
            } else {
                expeditionFeeContainer.style.display = 'none';
                expeditionFeeInput.value = 0;
            }
        });
    }

    if (editIsExpeditionCheckbox) {
        editIsExpeditionCheckbox.addEventListener('change', () => {
            if (editIsExpeditionCheckbox.checked) {
                editExpeditionFeeContainer.style.display = 'block';
            } else {
                editExpeditionFeeContainer.style.display = 'none';
                editExpeditionFeeInput.value = 0;
            }
        });
    }

    // NOUVEAU : Gère la soumission du formulaire de création de marchand
    addShopForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const shopData = {
            name: document.getElementById('newShopName').value,
            phone_number: document.getElementById('newShopPhone').value,
            bill_packaging: document.getElementById('newBillPackaging').checked,
            bill_storage: document.getElementById('newBillStorage').checked,
            packaging_price: parseFloat(document.getElementById('newPackagingPrice').value),
            storage_price: parseFloat(document.getElementById('newStoragePrice').value),
            created_by: CURRENT_USER_ID
        };
        try {
            const response = await axios.post(`${API_BASE_URL}/shops`, shopData);
            showNotification('Marchand créé avec succès !');
            // Met à jour le cache des marchands
            await fetchShops();
            // Sélectionne le nouveau marchand dans le formulaire de commande
            const newShop = shopsCache.find(s => s.id === response.data.shopId);
            if(newShop){
                addShopSearchInput.value = newShop.name;
                addSelectedShopIdInput.value = newShop.id;
            }
            addShopModal.hide();
        } catch (error) {
            console.error("Erreur lors de la création du marchand:", error);
            showNotification(error.response?.data?.message || "Erreur lors de la création du marchand.", 'danger');
        }
    });

    addOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const items = Array.from(itemsContainer.querySelectorAll('.item-row')).map(row => ({
            item_name: row.querySelector('.item-name-input').value,
            quantity: parseInt(row.querySelector('.item-quantity-input').value),
            amount: parseFloat(row.querySelector('.item-amount-input').value)
        }));

        if (items.length === 0 || !items[0].item_name) {
             showNotification('Veuillez ajouter au moins un article.', 'danger');
             return;
        }

        // CORRECTION DE LA LOGIQUE: On somme les montants, sans multiplier par la quantité.
        const totalArticleAmount = items.reduce((sum, item) => sum + item.amount, 0);

        const orderData = {
            shop_id: addSelectedShopIdInput.value,
            customer_name: document.getElementById('customerName').value,
            customer_phone: document.getElementById('customerPhone').value,
            delivery_location: document.getElementById('deliveryLocation').value,
            article_amount: totalArticleAmount,
            delivery_fee: document.getElementById('deliveryFee').value,
            expedition_fee: isExpeditionCheckbox.checked ? parseFloat(expeditionFeeInput.value) : 0,
            created_by: 1,
            items: items
        };

        try {
            await axios.post(`${API_BASE_URL}/orders`, orderData);
            showNotification('Commande créée avec succès !');
            addOrderModal.hide();
            await fetchAllData();
        } catch (error) {
            console.error("Erreur (ajout commande):", error);
            showNotification('Erreur lors de la création de la commande.', 'danger');
        }
    });

    editOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const orderId = editOrderIdInput.value;
        const items = Array.from(editItemsContainer.querySelectorAll('.item-row')).map(row => ({
            item_name: row.querySelector('.item-name-input').value,
            quantity: parseInt(row.querySelector('.item-quantity-input').value),
            amount: parseFloat(row.querySelector('.item-amount-input').value)
        }));

        // CORRECTION DE LA LOGIQUE: On somme les montants, sans multiplier par la quantité.
        const totalArticleAmount = items.reduce((sum, item) => sum + item.amount, 0);

        const expeditionFee = editIsExpeditionCheckbox.checked ? parseFloat(editExpeditionFeeInput.value) : 0;

        const updatedData = {
            shop_id: editSelectedShopIdInput.value,
            customer_name: document.getElementById('editCustomerName').value,
            customer_phone: document.getElementById('editCustomerPhone').value,
            delivery_location: document.getElementById('editDeliveryLocation').value,
            article_amount: totalArticleAmount,
            delivery_fee: document.getElementById('editDeliveryFee').value,
            expedition_fee: expeditionFee,
            items: items,
            deliveryman_id: editDeliverymanIdInput.value || null,
            created_at: editCreatedAtInput.value,
            updated_by: 1
        };
        try {
            await axios.put(`${API_BASE_URL}/orders/${orderId}`, updatedData);
            showNotification('Commande modifiée avec succès !');
            editOrderModal.hide();
            await fetchAllData();
        } catch (error) {
            console.error("Erreur (modif commande):", error);
            showNotification('Erreur lors de la modification de la commande.', 'danger');
        }
    });

    ordersTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('.dropdown-item');
        if (!target) return;
        const orderId = target.dataset.orderId;
        if (target.classList.contains('details-btn')) {
            try {
                const res = await axios.get(`${API_BASE_URL}/orders/${orderId}`);
                const order = res.data;
                const shopName = order.shop_name || 'N/A';
                const deliverymanName = order.deliveryman_name || 'Non assigné';
                const itemsHtml = order.items.map(item => `
                    <li>${item.item_name} (x${item.quantity}) - ${item.amount.toLocaleString('fr-FR')} FCFA</li>
                `).join('');
                const historyHtml = order.history.map(hist => {
                    let actionText = hist.action;
                    if (hist.action.includes("Assignée")) {
                        const assignedDeliveryman = deliverymenCache.find(dm => dm.id === hist.deliveryman_id);
                        if (assignedDeliveryman) {
                            actionText = `Assignée au livreur : ${assignedDeliveryman.name}`;
                        }
                    }
                    return `
                        <div class="border-start border-3 ps-3 mb-2">
                            <small class="text-muted">${new Date(hist.created_at).toLocaleString()}</small>
                            <p class="mb-0">${actionText}</p>
                            <small>Par: ${hist.user_name || 'N/A'}</small>
                        </div>
                    `;
                }).join('');
                document.getElementById('orderDetailsContent').innerHTML = `
                    <h6>Détails de la commande #${order.id}</h6>
                    <ul class="list-unstyled">
                        <li><strong>Marchand:</strong> ${shopName}</li>
                        <li><strong>Client:</strong> ${order.customer_name} (${order.customer_phone})</li>
                        <li><strong>Lieu de livraison:</strong> ${order.delivery_location}</li>
                        <li><strong>Montant article:</strong> ${order.article_amount.toLocaleString('fr-FR')} FCFA</li>
                        <li><strong>Frais de livraison:</strong> ${order.delivery_fee.toLocaleString('fr-FR')} FCFA</li>
                        <li><strong>Statut:</strong> <span class="badge bg-secondary">${statusTranslations[order.status] || 'Non spécifié'}</span></li>
                        <li><strong>Paiement:</strong> <span class="badge bg-secondary">${paymentTranslations[order.payment_status] || 'Non spécifié'}</span></li>
                        <li><strong>Livreur:</strong> ${deliverymanName}</li>
                        <li><strong>Date de création:</strong> ${new Date(order.created_at).toLocaleString()}</li>
                    </ul>
                    <hr>
                    <h6>Articles commandés</h6>
                    <ul class="list-unstyled">
                        ${itemsHtml}
                    </ul>
                    <hr>
                    <h6>Historique</h6>
                    ${historyHtml.length > 0 ? historyHtml : '<p>Aucun historique disponible.</p>'}
                `;
                orderDetailsModal.show();
            } catch (error) {
                console.error("Erreur lors de la récupération des détails:", error);
                showNotification("Impossible de charger les données de la commande.", 'danger');
            }
        } else if (target.classList.contains('delete-btn')) {
            if (confirm("Êtes-vous sûr de vouloir supprimer cette commande ?")) {
                try {
                    await axios.delete(`${API_BASE_URL}/orders/${orderId}`);
                    showNotification('Commande supprimée avec succès.');
                    await fetchAllData();
                } catch (error) {
                    console.error(error);
                    showNotification('Erreur lors de la suppression de la commande.', 'danger');
                }
            }
        } else if (target.classList.contains('status-delivered-btn')) {
            document.getElementById('statusActionModalLabel').textContent = `Paiement pour Commande #${orderId}`;
            deliveredPaymentForm.classList.remove('d-none');
            failedDeliveryForm.classList.add('d-none');
            statusActionModal.show();
            document.getElementById('paymentCashBtn').onclick = async () => {
                try {
                    await axios.put(`${API_BASE_URL}/orders/${orderId}/status`, { status: 'delivered', payment_status: 'cash', userId: 1 });
                    showNotification('Statut mis à jour en Livré (paiement cash).');
                    statusActionModal.hide();
                    await fetchAllData();
                } catch (error) {
                    console.error(error);
                    showNotification('Erreur lors de la mise à jour du statut.', 'danger');
                }
            };
            document.getElementById('paymentSupplierBtn').onclick = async () => {
                try {
                    await axios.put(`${API_BASE_URL}/orders/${orderId}/status`, { status: 'delivered', payment_status: 'paid_to_supplier', userId: 1 });
                    showNotification('Statut mis à jour en Livré (paiement au marchand).');
                    statusActionModal.hide();
                    await fetchAllData();
                } catch (error) {
                    console.error(error);
                    showNotification('Erreur lors de la mise à jour du statut.', 'danger');
                }
            };
        } else if (target.classList.contains('status-failed-btn')) {
            document.getElementById('statusActionModalLabel').textContent = `Livraison ratée pour Commande #${orderId}`;
            deliveredPaymentForm.classList.add('d-none');
            failedDeliveryForm.classList.remove('d-none');
            statusActionModal.show();
            failedDeliveryForm.onsubmit = async (e) => {
                e.preventDefault();
                const amount_received = document.getElementById('amountReceived').value;
                try {
                    await axios.put(`${API_BASE_URL}/orders/${orderId}/status`, { status: 'failed_delivery', amount_received: amount_received, userId: 1 });
                    showNotification('Statut mis à jour en Livraison ratée.');
                    statusActionModal.hide();
                    await fetchAllData();
                } catch (error) {
                    console.error(error);
                    showNotification('Erreur lors de la mise à jour du statut.', 'danger');
                }
            };
        } else if (target.classList.contains('status-reported-btn')) {
            if (confirm("Voulez-vous marquer cette commande comme 'À relancer' ?")) {
                try {
                    await axios.put(`${API_BASE_URL}/orders/${orderId}/status`, { status: 'reported', userId: 1 });
                    showNotification('Statut mis à jour en "À relancer"');
                    await fetchAllData();
                } catch (error) {
                    console.error(error);
                    showNotification('Erreur lors de la mise à jour du statut.', 'danger');
                }
            }
        } else if (target.classList.contains('status-cancelled-btn')) {
            if (confirm("Voulez-vous annuler cette commande ?")) {
                try {
                    await axios.put(`${API_BASE_URL}/orders/${orderId}/status`, { status: 'cancelled', userId: 1 });
                    showNotification('Commande annulée avec succès.');
                    await fetchAllData();
                } catch (error) {
                    console.error(error);
                    showNotification('Erreur lors de la mise à jour du statut.', 'danger');
                }
            }
        } else if (target.classList.contains('assign-btn')) {
            currentOrdersToAssign = [orderId];
            document.getElementById('assignOrdersId').textContent = `#${orderId}`;
            document.getElementById('assignOrdersCount').textContent = '1';
            assignDeliveryModal.show();
        }
    });

    // Événements pour les actions groupées
    document.querySelector('.bulk-assign-btn').addEventListener('click', () => {
        const selectedCheckboxes = Array.from(document.querySelectorAll('.order-checkbox:checked'));
        currentOrdersToAssign = selectedCheckboxes.map(cb => cb.dataset.orderId);
        if (currentOrdersToAssign.length > 0) {
            document.getElementById('assignOrdersId').textContent = 'Multiples';
            document.getElementById('assignOrdersCount').textContent = currentOrdersToAssign.length;
            assignDeliveryModal.show();
        } else {
            showNotification('Veuillez sélectionner au moins une commande.', 'warning');
        }
    });

    document.querySelector('.bulk-delete-btn').addEventListener('click', async () => {
        const selectedCheckboxes = Array.from(document.querySelectorAll('.order-checkbox:checked'));
        const ids = selectedCheckboxes.map(cb => cb.dataset.orderId);
        if (ids.length > 0) {
            if (confirm(`Êtes-vous sûr de vouloir supprimer ${ids.length} commande(s) ?`)) {
                try {
                    await axios.post(`${API_BASE_URL}/orders/bulk/delete`, { ids });
                    showNotification(`${ids.length} commande(s) supprimée(s) avec succès.`);
                    await fetchAllData();
                } catch (error) {
                    console.error(error);
                    showNotification('Erreur lors de la suppression groupée.', 'danger');
                }
            }
        } else {
            showNotification('Veuillez sélectionner au moins une commande.', 'warning');
        }
    });

    document.querySelector('.bulk-status-delivered-btn').addEventListener('click', () => {
        const selectedCheckboxes = Array.from(document.querySelectorAll('.order-checkbox:checked'));
        currentOrdersToAssign = selectedCheckboxes.map(cb => cb.dataset.orderId);
        if (currentOrdersToAssign.length > 0) {
            document.getElementById('bulkStatusModalLabel').textContent = `Statuer ${currentOrdersToAssign.length} commande(s) comme Livrée(s)`;
            bulkDeliveredPaymentForm.classList.remove('d-none');
            bulkFailedDeliveryForm.classList.add('d-none');
            bulkStatusActionModal.show();
        } else {
            showNotification('Veuillez sélectionner au moins une commande.', 'warning');
        }
    });
    
    document.querySelector('.bulk-status-failed-btn').addEventListener('click', () => {
        const selectedCheckboxes = Array.from(document.querySelectorAll('.order-checkbox:checked'));
        currentOrdersToAssign = selectedCheckboxes.map(cb => cb.dataset.orderId);
        if (currentOrdersToAssign.length > 0) {
            document.getElementById('bulkStatusModalLabel').textContent = `Statuer ${currentOrdersToAssign.length} commande(s) comme Livraison ratée`;
            bulkDeliveredPaymentForm.classList.add('d-none');
            bulkFailedDeliveryForm.classList.remove('d-none');
            bulkStatusActionModal.show();
        } else {
            showNotification('Veuillez sélectionner au moins une commande.', 'warning');
        }
    });
    
    document.querySelector('.bulk-status-cancel-btn').addEventListener('click', async () => {
        const selectedCheckboxes = Array.from(document.querySelectorAll('.order-checkbox:checked'));
        const ids = selectedCheckboxes.map(cb => cb.dataset.orderId);
        if (ids.length > 0) {
            if (confirm(`Êtes-vous sûr de vouloir annuler ${ids.length} commande(s) ?`)) {
                try {
                    await axios.post(`${API_BASE_URL}/orders/bulk/status`, { ids, status: 'cancelled', userId: 1 });
                    showNotification(`${ids.length} commande(s) annulée(s) avec succès.`);
                    await fetchAllData();
                } catch (error) {
                    console.error(error);
                    showNotification('Erreur lors de l\'annulation groupée.', 'danger');
                }
            }
        } else {
            showNotification('Veuillez sélectionner au moins une commande.', 'warning');
        }
    });

    document.querySelector('.bulk-status-reported-btn').addEventListener('click', async () => {
        const selectedCheckboxes = Array.from(document.querySelectorAll('.order-checkbox:checked'));
        const ids = selectedCheckboxes.map(cb => cb.dataset.orderId);
        if (ids.length > 0) {
            if (confirm(`Voulez-vous marquer ${ids.length} commande(s) comme 'À relancer' ?`)) {
                try {
                    await axios.post(`${API_BASE_URL}/orders/bulk/status`, { ids, status: 'reported', userId: 1 });
                    showNotification(`${ids.length} commande(s) marquée(s) "À relancer".`);
                    await fetchAllData();
                } catch (error) {
                    console.error(error);
                    showNotification('Erreur lors de la mise à jour groupée du statut.', 'danger');
                }
            }
        } else {
            showNotification('Veuillez sélectionner au moins une commande.', 'warning');
        }
    });
    
    bulkDeliveredPaymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const paymentType = document.querySelector('input[name="bulkPaymentRadio"]:checked').value;
        try {
            await axios.post(`${API_BASE_URL}/orders/bulk/status`, { ids: currentOrdersToAssign, status: 'delivered', payment_status: paymentType, userId: 1 });
            showNotification('Statuts mis à jour avec succès.');
            bulkStatusActionModal.hide();
            await fetchAllData();
        } catch (error) {
            console.error(error);
            showNotification('Erreur lors de la mise à jour groupée des statuts.', 'danger');
        }
    });

    bulkFailedDeliveryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount_received = document.getElementById('bulkAmountReceived').value;
        try {
            await axios.post(`${API_BASE_URL}/orders/bulk/status`, { ids: currentOrdersToAssign, status: 'failed_delivery', amount_received: amount_received, userId: 1 });
            showNotification('Statuts mis à jour avec succès.');
            bulkStatusActionModal.hide();
            await fetchAllData();
        } catch (error) {
            console.error(error);
            showNotification('Erreur lors de la mise à jour groupée des statuts.', 'danger');
        }
    });

    // Fonctions de recherche
    const setupShopSearch = (inputId, resultsId, hiddenId) => {
        const input = document.getElementById(inputId);
        const resultsContainer = document.getElementById(resultsId);
        const hiddenInput = document.getElementById(hiddenId);

        input.addEventListener('input', () => {
            const searchText = input.value.toLowerCase();
            resultsContainer.innerHTML = '';
            hiddenInput.value = '';

            if (searchText.length === 0) {
                resultsContainer.classList.add('d-none');
                return;
            }

            const filteredShops = shopsCache.filter(shop => shop.name.toLowerCase().includes(searchText));

            if (filteredShops.length > 0) {
                filteredShops.forEach(shop => {
                    const resultDiv = document.createElement('div');
                    resultDiv.textContent = shop.name;
                    resultDiv.addEventListener('click', () => {
                        input.value = shop.name;
                        hiddenInput.value = shop.id;
                        resultsContainer.classList.add('d-none');
                    });
                    resultsContainer.appendChild(resultDiv);
                });
                resultsContainer.classList.remove('d-none');
            } else {
                resultsContainer.classList.add('d-none');
            }
        });

        document.addEventListener('click', (e) => {
            if (!resultsContainer.contains(e.target) && e.target !== input) {
                resultsContainer.classList.add('d-none');
            }
        });
    };

    const setupDeliverymanSearch = () => {
        deliverymanSearchInput.addEventListener('input', () => {
            const searchText = deliverymanSearchInput.value.toLowerCase();
            deliverymanSearchResultsContainer.innerHTML = '';
            assignDeliverymanIdInput.value = '';

            if (searchText.length === 0) {
                deliverymanSearchResultsContainer.classList.add('d-none');
                return;
            }

            const filteredDeliverymen = deliverymenCache.filter(dm => dm.name.toLowerCase().includes(searchText));

            if (filteredDeliverymen.length > 0) {
                filteredDeliverymen.forEach(dm => {
                    const resultDiv = document.createElement('div');
                    resultDiv.textContent = dm.name;
                    resultDiv.addEventListener('click', () => {
                        deliverymanSearchInput.value = dm.name;
                        assignDeliverymanIdInput.value = dm.id;
                        deliverymanSearchResultsContainer.classList.add('d-none');
                    });
                    deliverymanSearchResultsContainer.appendChild(resultDiv);
                });
                deliverymanSearchResultsContainer.classList.remove('d-none');
            } else {
                deliverymanSearchResultsContainer.classList.add('d-none');
            }
        });
    };

    assignDeliveryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const deliverymanId = assignDeliverymanIdInput.value;
        if (!deliverymanId) {
            showNotification("Veuillez sélectionner un livreur.", 'warning');
            return;
        }

        try {
            await axios.post(`${API_BASE_URL}/orders/bulk/assign`, {
                ids: currentOrdersToAssign,
                deliverymanId: deliverymanId
            });
            showNotification(`Livreur assigné à ${currentOrdersToAssign.length} commande(s).`);
            assignDeliveryModal.hide();
            await fetchAllData();
        } catch (error) {
            console.error(error);
            showNotification('Erreur lors de l\'assignation du livreur.', 'danger');
        }
    });
    
    // Gère le comportement de l'unique checkbox pour tout sélectionner
    selectAllCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        document.querySelectorAll('.order-checkbox').forEach(cb => {
            cb.checked = isChecked;
        });
    });

    statusFilterMenu.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.target.closest('.status-filter-option');
        if (target) {
            selectedStatusFilter = target.dataset.status;
            statusFilterBtn.textContent = `Statut : ${target.textContent}`;
            applyFilters();
        }
    });


    // Initialisation
    await Promise.all([fetchShops(), fetchDeliverymen()]);
    await fetchAllData();
    setupShopSearch('shopSearchInput', 'searchResults', 'selectedShopId');
    setupShopSearch('editShopSearchInput', 'editSearchResults', 'editSelectedShopId');
    setupDeliverymanSearch();
    addItemBtn.addEventListener('click', () => addItemRow(itemsContainer));
    editAddItemBtn.addEventListener('click', () => addItemRow(editItemsContainer));
    handleRemoveItem(itemsContainer);
    handleRemoveItem(editItemsContainer);
    filterBtn.addEventListener('click', applyFilters);
    searchInput.addEventListener('input', applyFilters); // NOUVEAU: déclenche le filtre en temps réel
    startDateFilter.addEventListener('change', applyFilters);
    endDateFilter.addEventListener('change', applyFilters);

    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const sidebarToggler = document.getElementById('sidebar-toggler');
    const logoutBtn = document.getElementById('logoutBtn');

    if (sidebarToggler) {
        sidebarToggler.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
        });
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
});
