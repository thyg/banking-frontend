DROP KEYSPACE IF EXISTS comops;

CREATE KEYSPACE comops WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'} ;

USE comops;

CREATE TYPE IF NOT EXISTS client_summary (
    id TEXT,
    name TEXT,
    reference TEXT,
    address TEXT
);

CREATE TYPE IF NOT EXISTS order_item (
    id TEXT,
    productId TEXT,
    code TEXT,
    name TEXT,
    quantity INT,
    unitPrice DOUBLE,
    discount DOUBLE,
    total DOUBLE,
    poste TEXT,
    depot TEXT
);

CREATE TYPE IF NOT EXISTS payment (
    id TEXT,
    date TIMESTAMP,
    amount DOUBLE,
    method TEXT,
    notes TEXT
);

CREATE TYPE IF NOT EXISTS permission_set (
    read_ BOOLEAN,
    create_ BOOLEAN,
    update_ BOOLEAN,
    delete_ BOOLEAN
);

CREATE TYPE IF NOT EXISTS stock_movement_item (
    productId TEXT,
    quantity INT,
    costPrice DOUBLE,
    code TEXT,
    name TEXT,
    stockBefore INT,
    stockAfter INT,
    unit TEXT,
    notes TEXT
);

CREATE TYPE IF NOT EXISTS inventory_item (
    productId TEXT,
    productCode TEXT,
    productName TEXT,
    theoreticalQty INT,
    physicalQty INT,
    variance INT,
    costPrice DOUBLE,
    unit TEXT,
    location TEXT,
    notes TEXT
);

CREATE TYPE IF NOT EXISTS warehouse_transfer_item (
    productId TEXT,
    quantity INT,
    costPrice DOUBLE
);

CREATE TYPE IF NOT EXISTS product_transformation_item (
    productId TEXT,
    quantity INT,
    costPrice DOUBLE
);

CREATE TYPE IF NOT EXISTS cancellation_days (
    invoices INT,
    creditNotes INT,
    deliveries INT,
    purchases INT
);

CREATE TYPE IF NOT EXISTS sales_opts (
    canNegotiatePrice BOOLEAN,
    priceIncludesVAT BOOLEAN,
    allowMultiWarehouseSales BOOLEAN,
    stockValueDisplay TEXT,
    allowTechnicalInvoices BOOLEAN,
    allowDocumentChanges BOOLEAN,
    maxDiscountRate INT,
    cancellationDays FROZEN<cancellation_days>
);

CREATE TYPE IF NOT EXISTS general_opts (
    autoInvoiceFromDelivery BOOLEAN,
    autoAccountingInterface BOOLEAN,
    autoTreasuryInterface BOOLEAN,
    printTradeRegistryOnInvoice BOOLEAN,
    useCashRegisterPrinter BOOLEAN,
    allowEntriesInClosedPeriod BOOLEAN,
    decimalPlaces INT,
    maxTechnicalMargin INT,
    dateFormat TEXT,
    isSupermarket BOOLEAN,
    modifySalePriceOnPurchase BOOLEAN
);

CREATE TYPE IF NOT EXISTS term_invoicing_opts (
    vatInvoicePrefix TEXT,
    vatInvoiceSuffix TEXT,
    vatInvoiceLength INT,
    noVatInvoicePrefix TEXT,
    noVatInvoiceSuffix TEXT,
    noVatInvoiceLength INT,
    leftSignature TEXT,
    rightSignature TEXT,
    middleSignature TEXT
);

CREATE TYPE IF NOT EXISTS cash_invoicing_opts (
    vatInvoicePrefix TEXT,
    vatInvoiceSuffix TEXT,
    vatInvoiceLength INT,
    noVatInvoicePrefix TEXT,
    noVatInvoiceSuffix TEXT,
    noVatInvoiceLength INT,
    useCashRegisterBalance BOOLEAN
);

CREATE TYPE IF NOT EXISTS printing_opts (
    previewBeforePrint BOOLEAN,
    orientation TEXT,
    width INT,
    height INT,
    format TEXT
);


-- #####################################################################
-- # 2. Création des Tables                                            #
-- #####################################################################

CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    code TEXT,
    companyName TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    phone TEXT,
    fax TEXT,
    email TEXT,
    website TEXT,
    contactPerson TEXT,
    legalForm TEXT,
    clientFamily TEXT,
    clientType TEXT,
    paymentTerms TEXT,
    balance DOUBLE,
    notes TEXT,
    pricingLevels LIST<TEXT>,
    isTaxable BOOLEAN,
    isActive BOOLEAN
);

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT,
    family TEXT,
    stock INT,
    costPrice DOUBLE,
    salePrice DOUBLE,
    wholesalePrice DOUBLE,
    semiWholesalePrice DOUBLE,
    mainSupplier TEXT,
    purchaseUnit TEXT,
    saleUnit TEXT,
    supplierRef TEXT,
    billingStation TEXT,
    notes TEXT,
    saleRef TEXT,
    minStock INT,
    maxStock INT,
    threshold INT,
    isPerishable BOOLEAN,
    isDiscountable BOOLEAN,
    isActive BOOLEAN
);

CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoiceNumber TEXT,
    client FROZEN<client_summary>,
    orderDate TIMESTAMP,
    dueDate TIMESTAMP,
    status TEXT,
    items LIST<FROZEN<order_item>>,
    payments LIST<FROZEN<payment>>,
    totalHT DOUBLE,
    totalDiscount DOUBLE,
    totalNetHT DOUBLE,
    precompte DOUBLE,
    totalTVA DOUBLE,
    totalTTC DOUBLE,
    totalPaid DOUBLE,
    balanceDue DOUBLE
);

CREATE TABLE IF NOT EXISTS order_journal (
    id TEXT PRIMARY KEY,
    blNumber TEXT,
    clientName TEXT,
    amountHT DOUBLE,
    discount DOUBLE,
    tva DOUBLE,
    precompte DOUBLE,
    commission DOUBLE,
    orderDate TIMESTAMP,
    status TEXT,
    salesperson TEXT,
    items LIST<FROZEN<order_item>>
);

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    client FROZEN<client_summary>,
    orderNumber TEXT,
    status TEXT,
    paymentMethod TEXT,
    orderDate TIMESTAMP,
    deliveryDate TIMESTAMP,
    endDate TIMESTAMP,
    salesperson TEXT,
    notes TEXT,
    motif TEXT,
    items LIST<FROZEN<order_item>>,
    totalHT DOUBLE,
    totalDiscount DOUBLE,
    totalNetHT DOUBLE,
    precompte DOUBLE,
    totalTVA DOUBLE,
    totalTTC DOUBLE,
    netToPay DOUBLE
);

CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    name TEXT,
    code TEXT,
    address TEXT,
    isActive BOOLEAN
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    type TEXT,
    reference TEXT,
    date TIMESTAMP,
    warehouseId TEXT,
    warehouseDestinationId TEXT,
    notes TEXT,
    status TEXT,
    source TEXT,
    createdBy TEXT,
    validatedBy TEXT,
    validatedAt TIMESTAMP,
    documentNumber TEXT,
    supplierId TEXT,
    customerId TEXT,
    totalValue DOUBLE,
    items LIST<FROZEN<stock_movement_item>>
);

CREATE TABLE IF NOT EXISTS inventories (
    id TEXT PRIMARY KEY,
    reference TEXT,
    warehouseId TEXT,
    date TIMESTAMP,
    status TEXT,
    type TEXT,
    notes TEXT,
    createdBy TEXT,
    validatedBy TEXT,
    validatedAt TIMESTAMP,
    createdAt TIMESTAMP,
    updatedAt TIMESTAMP,
    totalVariance DOUBLE,
    itemsCount INT,
    completionPercentage INT,
    priority TEXT,
    items LIST<FROZEN<inventory_item>>
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT,
    title TEXT,
    profileId TEXT,
    creationDate TIMESTAMP,
    email TEXT,
    password TEXT,
    firstName TEXT,
    lastName TEXT,
    company TEXT
);

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    permissions MAP<TEXT, FROZEN<permission_set>>,
    authorizedPrices LIST<TEXT>,
    authorizedWarehouses LIST<TEXT>,
    authorizedPaymentModes LIST<TEXT>,
    authorizedDiscounts LIST<TEXT>
);

CREATE TABLE IF NOT EXISTS system_audits (
    id TEXT PRIMARY KEY,
    "user" TEXT,
    action TEXT,
    date TIMESTAMP,
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    code TEXT,
    companyName TEXT,
    contactPerson TEXT,
    phone TEXT,
    email TEXT,
    balance DOUBLE,
    notes TEXT,
    isActive BOOLEAN
);

CREATE TABLE IF NOT EXISTS general_options (
    id TEXT PRIMARY KEY,
    general FROZEN<general_opts>,
    sales FROZEN<sales_opts>,
    termInvoicing FROZEN<term_invoicing_opts>,
    cashInvoicing FROZEN<cash_invoicing_opts>,
    printing FROZEN<printing_opts>
);

CREATE TABLE IF NOT EXISTS fiscal_years (
    id TEXT PRIMARY KEY,
    name TEXT,
    startDate TIMESTAMP,
    endDate TIMESTAMP,
    status TEXT
);

CREATE TABLE IF NOT EXISTS warehouse_transfers (
    id TEXT PRIMARY KEY,
    reference TEXT,
    date TIMESTAMP,
    sourceWarehouseId TEXT,
    destinationWarehouseId TEXT,
    description TEXT,
    notes TEXT,
    items LIST<FROZEN<warehouse_transfer_item>>
);

CREATE TABLE IF NOT EXISTS product_transformations (
    id TEXT PRIMARY KEY,
    reference TEXT,
    date TIMESTAMP,
    warehouseId TEXT,
    description TEXT,
    notes TEXT,
    inputItems LIST<FROZEN<product_transformation_item>>,
    outputItems LIST<FROZEN<product_transformation_item>>
);


-- Clients
INSERT INTO clients JSON '{ "id": "cl-001", "code": "SOCOBAM", "companyName": "SOCOBAM SARL", "contactPerson": "M. Talla Jean", "phone": "+237 699887766", "email": "contact@socobam.com", "balance": 1250000, "isActive": true, "isTaxable": true, "pricingLevels": [ "gros" ] }';
INSERT INTO clients JSON '{ "id": "cl-002", "code": "Q-BAT", "companyName": "Quincaillerie Le Bâtisseur", "contactPerson": "Mme. Amina Traoré", "phone": "+237 677665544", "email": "amina.t@lebatisseur.net", "balance": -50000, "isActive": true, "isTaxable": false, "pricingLevels": [ "detail" ] }';
INSERT INTO clients JSON '{ "id": "cl-003", "code": "GLOBAL-EXP", "companyName": "ETS Global Express", "contactPerson": "Moussa Cissé", "phone": "+237 655443322", "email": "direction@globalexp.org", "balance": 0, "isActive": false, "isTaxable": true, "pricingLevels": [ "demi-gros" ] }';
INSERT INTO clients JSON '{ "id": "cl-004", "code": "AGRI-FASO", "companyName": "AgriFaso SA", "contactPerson": "Fatoumata Diop", "phone": "+226 70123456", "email": "achats@agrifaso.bf", "balance": 780000, "isActive": true, "isTaxable": true, "pricingLevels": [ "gros", "super-gros" ], "notes": "test" }';
INSERT INTO clients JSON '{ "id": "cl-005", "code": "TRANS-LOG", "companyName": "TransLogistique Gabon", "contactPerson": "Paul Obame", "phone": "+241 077112233", "email": "logistique@translog.ga", "balance": -210000, "isActive": true, "isTaxable": true, "pricingLevels": [ "detail" ] }';
INSERT INTO clients JSON '{ "id": "516b", "companyName": "taylor PIO", "code": "A2000", "contactPerson": "11111111", "phone": "651230157", "email": "igormogou86@gmail.com", "isActive": true, "isTaxable": true, "balance": 0, "notes": "TS" }';

-- Products
INSERT INTO products JSON '{ "id": "prod-001", "code": "CIM-LION-42R", "name": "Ciment ''Lion'' 42.5R", "family": "Cimenterie", "stock": 1, "costPrice": 4800, "salePrice": 5500, "wholesalePrice": 5200, "semiWholesalePrice": 5350, "saleRef": "A-CIM-001", "minStock": 10, "maxStock": 100, "threshold": 20, "mainSupplier": "CIMENCAM", "isPerishable": false, "isDiscountable": true, "isActive": true }';
INSERT INTO products JSON '{ "id": "prod-002", "code": "TOL-BAC-2M", "name": "Tôle Bac Acier 2m (0.35mm)", "family": "Tôlerie", "stock": 248, "costPrice": 2900, "salePrice": 3500, "wholesalePrice": 3200, "semiWholesalePrice": 3300, "saleRef": "A-TOL-002", "minStock": 5, "maxStock": 50, "threshold": 10, "mainSupplier": "ALUCAM", "isPerishable": false, "isDiscountable": true, "isActive": true }';
INSERT INTO products JSON '{ "id": "prod-003", "code": "PEI-SEIG-15L", "name": "Peinture Acrylique ''Seigneurie'' Mat 15L", "family": "Peinture", "stock": 1, "costPrice": 25000, "salePrice": 28000, "wholesalePrice": 27000, "semiWholesalePrice": 27500, "saleRef": "A-PEI-003", "minStock": 2, "maxStock": 20, "threshold": 5, "mainSupplier": "SOFAP", "isPerishable": true, "isDiscountable": false, "isActive": true }';
INSERT INTO products JSON '{ "id": "prod-004", "code": "FER-HA8", "name": "Fer à béton HA8", "family": "Ferraillage", "stock": 1, "costPrice": 3500, "salePrice": 4000, "wholesalePrice": 3800, "semiWholesalePrice": 3900, "saleRef": "A-FER-004", "minStock": 20, "maxStock": 200, "threshold": 40, "mainSupplier": "PROMETAL", "isPerishable": false, "isDiscountable": true, "isActive": true }';
INSERT INTO products JSON '{ "id": "prod-005", "code": "CAB-TH-2.5", "name": "Câble électrique TH 2.5mm (100m)", "family": "Electricité", "stock": 3, "costPrice": 22000, "salePrice": 25000, "wholesalePrice": 24000, "semiWholesalePrice": 24500, "saleRef": "A-CAB-005", "minStock": 1, "maxStock": 10, "threshold": 2, "mainSupplier": "NEXANS CI", "isPerishable": false, "isDiscountable": false, "isActive": false }';
INSERT INTO products JSON '{ "id": "prod-006", "code": "PVC-P-110", "name": "Tuyau PVC Pression D110", "family": "Plomberie", "stock": 2, "costPrice": 8500, "salePrice": 9500, "wholesalePrice": 9000, "semiWholesalePrice": 9200, "saleRef": "A-PVC-006", "minStock": 3, "maxStock": 30, "threshold": 8, "mainSupplier": "SIVOPLAST", "isPerishable": false, "isDiscountable": true, "isActive": true }';

-- Invoices
INSERT INTO invoices JSON '{ "id": "inv-001", "invoiceNumber": "FA2024-05-001", "client": { "id": "cl-001", "name": "SOCOBAM SARL", "reference": "SOCOBAM" }, "orderDate": "2024-05-20T10:00:00.000Z", "dueDate": "2024-06-20T10:00:00.000Z", "status": "PP", "items": [ { "id": "1", "productId": "prod-001", "code": "CIM-LION-42R", "name": "Ciment ''Lion'' 42.5R", "quantity": 100, "unitPrice": 5500.0, "discount": 0, "total": 550000 } ], "payments": [ { "id": "pay-001", "date": "2024-05-21T10:00:00.000Z", "amount": 300000, "method": "Virement" } ], "totalHT": 550000, "totalDiscount": 0, "totalNetHT": 550000, "precompte": 0, "totalTVA": 104775, "totalTTC": 654775, "totalPaid": 300000, "balanceDue": 354775 }';
INSERT INTO invoices JSON '{ "id": "inv-002", "invoiceNumber": "FA2024-05-002", "client": { "id": "cl-002", "name": "Quincaillerie Le Bâtisseur", "reference": "Q-BAT" }, "orderDate": "2024-05-22T14:30:00.000Z", "dueDate": "2024-05-22T14:30:00.000Z", "status": "P", "items": [ { "id": "2", "productId": "prod-002", "code": "TOL-BAC-2M", "name": "Tôle Bac Acier 2m (0.35mm)", "quantity": 50, "unitPrice": 3500.0, "discount": 0, "total": 175000 } ], "payments": [ { "id": "pay-002", "date": "2024-05-22T14:35:00.000Z", "amount": 175000, "method": "Espèce" } ], "totalHT": 175000, "totalDiscount": 0, "totalNetHT": 175000, "precompte": 0, "totalTVA": 0, "totalTTC": 175000, "totalPaid": 175000, "balanceDue": 0 }';
INSERT INTO invoices JSON '{ "id": "inv-003", "invoiceNumber": "FA2024-05-003", "client": { "id": "cl-004", "name": "AgriFaso SA", "reference": "AGRI-FASO" }, "orderDate": "2024-05-15T09:00:00.000Z", "dueDate": "2024-06-15T09:00:00.000Z", "status": "NP", "items": [ { "id": "3", "productId": "prod-004", "code": "FER-HA8", "name": "Fer à béton HA8", "quantity": 200, "unitPrice": 4000.0, "discount": 0, "total": 800000 } ], "payments": [], "totalHT": 800000, "totalDiscount": 0, "totalNetHT": 800000, "precompte": 0, "totalTVA": 152000, "totalTTC": 952000, "totalPaid": 0, "balanceDue": 952000 }';
INSERT INTO invoices JSON '{ "id": "inv-004", "invoiceNumber": "FA2024-04-101", "client": { "id": "cl-001", "name": "SOCOBAM SARL", "reference": "SOCOBAM" }, "orderDate": "2024-04-10T11:00:00.000Z", "dueDate": "2024-05-10T11:00:00.000Z", "status": "A", "items": [ { "id": "4", "productId": "prod-005", "code": "CAB-TH-2.5", "name": "Câble électrique TH 2.5mm (100m)", "quantity": 10, "unitPrice": 25000.0, "discount": 0, "total": 250000 } ], "payments": [], "totalHT": 250000, "totalDiscount": 0, "totalNetHT": 250000, "precompte": 0, "totalTVA": 47500, "totalTTC": 297500, "totalPaid": 0, "balanceDue": 297500 }';

-- Order Journal
INSERT INTO order_journal JSON '{ "id": "journ-001", "blNumber": "BL2024-001", "clientName": "SOCOBAM SARL", "amountHT": 350000, "discount": 15000, "tva": 64237, "precompte": 7350, "commission": 0, "orderDate": "2024-05-27T00:00:00.000Z", "status": "Facturée", "salesperson": "Administrateur", "items": [ { "id": "item1", "code": "CIM-LION-42R", "name": "Ciment ''Lion'' 42.5R", "quantity": 10, "unitPrice": 35000.0, "discount": 0, "total": 350000 } ] }';
INSERT INTO order_journal JSON '{ "id": "journ-002", "blNumber": "BL2024-002", "clientName": "Quincaillerie Le Bâtisseur", "amountHT": 175000, "discount": 0, "tva": 0, "precompte": 0, "commission": 0, "orderDate": "2024-05-26T00:00:00.000Z", "status": "Livrée", "salesperson": "Vendeur 1", "items": [ { "id": "item2", "code": "TOL-BAC-2M", "name": "Tôle Bac Acier 2m (0.35mm)", "quantity": 50, "unitPrice": 3500.0, "discount": 0, "total": 175000 } ] }';
INSERT INTO order_journal JSON '{ "id": "journ-003", "blNumber": "BL2024-003", "clientName": "AgriFaso SA", "amountHT": 800000, "discount": 0, "tva": 152000, "precompte": 0, "commission": 0, "orderDate": "2024-05-25T00:00:00.000Z", "status": "Facturée", "salesperson": "Administrateur", "items": [ { "id": "item3", "code": "FER-HA8", "name": "Fer à béton HA8", "quantity": 200, "unitPrice": 4000.0, "discount": 0, "total": 800000 } ] }';

-- Orders
INSERT INTO orders JSON '{ "id": "ord-001", "orderNumber": "CMD001", "client": { "id": "cl-001", "name": "SOCOBAM SARL", "reference": "SOCOBAM" }, "status": "Confirmed", "paymentMethod": "Credit", "orderDate": "2024-05-28T00:00:00.000Z", "items": [], "totalHT": 150000, "totalDiscount": 5000, "totalNetHT": 145000, "precompte": 3190, "totalTVA": 27593.75, "totalTTC": 172593.75, "netToPay": 169403.75 }';
INSERT INTO orders JSON '{ "id": "ord-002", "orderNumber": "CMD002", "client": { "id": "cl-002", "name": "Quincaillerie Le Bâtisseur", "reference": "Q-BAT" }, "status": "Invoiced", "paymentMethod": "Cash", "orderDate": "2024-05-22T00:00:00.000Z", "items": [], "totalHT": 175000, "totalDiscount": 0, "totalNetHT": 175000, "precompte": 0, "totalTVA": 0, "totalTTC": 175000, "netToPay": 175000 }';

-- Warehouses
INSERT INTO warehouses JSON '{ "id": "wh-001", "name": "SURFACE VENTE MOKOLO", "code": "SVM", "address": "Avenue Mokolo, Yaoundé", "isActive": true }';
INSERT INTO warehouses JSON '{ "id": "wh-002", "name": "DÉPÔT MAGZI", "code": "DMG", "address": "Zone Industrielle Magzi, Douala", "isActive": true }';
INSERT INTO warehouses JSON '{ "id": "wh-003", "name": "ANNEXE NKOLBISSON", "code": "ANK", "address": "Quartier Nkolbisson, Yaoundé", "isActive": true }';

-- Stock Movements
INSERT INTO stock_movements JSON '{ "id": "sm-001", "type": "entry", "reference": "ENT2405-001", "date": "2024-05-27T10:00:00.000Z", "warehouseId": "wh-001", "notes": "Achat Fournisseur PROMETAL", "status": "validated", "source": "purchase", "createdBy": "user-001", "validatedBy": "user-002", "validatedAt": "2024-05-27T10:30:00.000Z", "documentNumber": "FA-PROMETAL-2024-001", "supplierId": "supp-001", "totalValue": 1750000, "items": [ { "productId": "prod-004", "quantity": 500, "costPrice": 3500, "code": "FER-HA8", "name": "Fer à béton HA8", "stockBefore": 0, "stockAfter": 500, "unit": "barres" } ] }';
INSERT INTO stock_movements JSON '{ "id": "sm-002", "type": "exit", "reference": "SORT2405-001", "date": "2024-05-28T11:30:00.000Z", "warehouseId": "wh-001", "notes": "Vente client SOCOBAM", "status": "validated", "source": "sale", "createdBy": "user-001", "validatedBy": "user-001", "validatedAt": "2024-05-28T11:45:00.000Z", "documentNumber": "FC-SOCOBAM-2024-001", "customerId": "cl-001", "totalValue": 275000, "items": [ { "productId": "prod-001", "quantity": 50, "costPrice": 4800, "code": "CIM-LION-42R", "name": "Ciment ''Lion'' 42.5R", "stockBefore": 100, "stockAfter": 50, "unit": "sacs" } ] }';
INSERT INTO stock_movements JSON '{ "id": "sm-003", "type": "transfer", "reference": "TRANS2405-001", "date": "2024-05-29T14:00:00.000Z", "warehouseId": "wh-001", "warehouseDestinationId": "wh-002", "notes": "Transfert vers dépôt principal", "status": "validated", "source": "manual", "createdBy": "user-003", "validatedBy": "user-002", "validatedAt": "2024-05-29T14:30:00.000Z", "totalValue": 87000, "items": [ { "productId": "prod-002", "quantity": 30, "costPrice": 2900, "code": "TOL-BAC-2M", "name": "Tôle Bac Acier 2m (0.35mm)", "stockBefore": 280, "stockAfter": 250, "unit": "unités" } ] }';
INSERT INTO stock_movements JSON '{ "id": "sm-004", "type": "adjustment", "reference": "ADJ2405-001", "date": "2024-05-30T09:15:00.000Z", "warehouseId": "wh-002", "notes": "Ajustement suite inventaire - casse", "status": "validated", "source": "inventory", "createdBy": "user-001", "validatedBy": "user-002", "validatedAt": "2024-05-30T09:30:00.000Z", "totalValue": -5800, "items": [ { "productId": "prod-002", "quantity": -2, "costPrice": 2900, "code": "TOL-BAC-2M", "name": "Tôle Bac Acier 2m (0.35mm)", "stockBefore": 250, "stockAfter": 248, "unit": "unités", "notes": "Tôles endommagées lors du stockage" } ] }';
INSERT INTO stock_movements JSON '{ "id": "1ecb", "type": "exit", "reference": "EXIT-1754844929419", "date": "2025-08-10T16:51:53.756Z", "warehouseId": "wh-001", "notes": "", "status": "pending", "source": "manual", "createdBy": "user-001", "totalValue": 12500, "items": [ { "productId": "prod-002", "quantity": 1, "costPrice": 2900, "code": "TOL-BAC-2M", "name": "Tôle Bac Acier 2m (0.35mm)", "unit": "unités" }, { "productId": "prod-001", "quantity": 2, "costPrice": 4800, "code": "CIM-LION-42R", "name": "Ciment ''Lion'' 42.5R", "unit": "sacs" } ] }';

-- Inventories
INSERT INTO inventories JSON '{ "id": "inv-s-001", "reference": "INV-2024-001", "warehouseId": "wh-001", "date": "2024-05-29T00:00:00.000Z", "status": "Validé", "type": "Spontané", "notes": "Inventaire de contrôle avant livraison", "createdBy": "user-001", "validatedBy": "user-002", "validatedAt": "2024-05-29T16:30:00.000Z", "createdAt": "2024-05-29T08:00:00.000Z", "updatedAt": "2024-05-29T16:30:00.000Z", "totalVariance": -5800, "itemsCount": 3, "completionPercentage": 67, "priority": "high", "items": [ { "productId": "prod-001", "productCode": "CIM-LION-42R", "productName": "Ciment ''Lion'' 42.5R", "theoreticalQty": 100, "physicalQty": 100, "variance": 0, "costPrice": 4800, "unit": "sacs", "location": "Zone A-1" }, { "productId": "prod-002", "productCode": "TOL-BAC-2M", "productName": "Tôle Bac Acier 2m (0.35mm)", "theoreticalQty": 250, "physicalQty": 248, "variance": -2, "costPrice": 2900, "unit": "unités", "location": "Zone B-2", "notes": "2 unités endommagées" }, { "productId": "prod-006", "productCode": "PVC-P-110", "productName": "Tuyau PVC Pression D110", "theoreticalQty": 120, "physicalQty": null, "variance": null, "costPrice": 8500, "unit": "mètres", "location": "Zone C-1" } ] }';
INSERT INTO inventories JSON '{ "id": "inv-s-002", "reference": "INV-2023-ANNUEL", "warehouseId": "wh-002", "date": "2023-12-31T00:00:00.000Z", "status": "Validé", "type": "Annuel", "notes": "Inventaire de fin d''exercice 2023", "createdBy": "user-001", "validatedBy": "user-002", "validatedAt": "2023-12-31T23:59:00.000Z", "createdAt": "2023-12-15T08:00:00.000Z", "updatedAt": "2023-12-31T23:59:00.000Z", "totalVariance": 0, "itemsCount": 0, "completionPercentage": 100, "priority": "high", "items": [] }';
INSERT INTO inventories JSON '{ "id": "dedc", "reference": "INV-wh-002-1753878068773", "warehouseId": "wh-002", "date": "2025-07-30T12:21:08.773Z", "status": "Validé", "type": "Tournant", "items": [ { "productId": "prod-001", "productCode": "CIM-LION-42R", "productName": "Ciment ''Lion'' 42.5R", "theoreticalQty": 150, "physicalQty": 1 }, { "productId": "prod-002", "productCode": "TOL-BAC-2M", "productName": "Tôle Bac Acier 2m (0.35mm)", "theoreticalQty": 300, "physicalQty": 1 }, { "productId": "prod-003", "productCode": "PEI-SEIG-15L", "productName": "Peinture Acrylique ''Seigneurie'' Mat 15L", "theoreticalQty": 50, "physicalQty": 1 }, { "productId": "prod-004", "productCode": "FER-HA8", "productName": "Fer à béton HA8", "theoreticalQty": 500, "physicalQty": 1 }, { "productId": "prod-005", "productCode": "CAB-TH-2.5", "productName": "Câble électrique TH 2.5mm (100m)", "theoreticalQty": 0, "physicalQty": 3 }, { "productId": "prod-006", "productCode": "PVC-P-110", "productName": "Tuyau PVC Pression D110", "theoreticalQty": 120, "physicalQty": 2 } ] }';
INSERT INTO inventories JSON '{ "id": "8e54", "reference": "INV-wh-001-1754847286705", "warehouseId": "wh-001", "date": "2025-08-10T17:34:46.705Z", "status": "En cours", "type": "Tournant", "items": [ { "productId": "prod-001", "productCode": "CIM-LION-42R", "productName": "Ciment ''Lion'' 42.5R", "theoreticalQty": 1, "physicalQty": 2 }, { "productId": "prod-002", "productCode": "TOL-BAC-2M", "productName": "Tôle Bac Acier 2m (0.35mm)", "theoreticalQty": 1, "physicalQty": 2 }, { "productId": "prod-003", "productCode": "PEI-SEIG-15L", "productName": "Peinture Acrylique ''Seigneurie'' Mat 15L", "theoreticalQty": 1, "physicalQty": 2 }, { "productId": "prod-004", "productCode": "FER-HA8", "productName": "Fer à béton HA8", "theoreticalQty": 1, "physicalQty": null }, { "productId": "prod-005", "productCode": "CAB-TH-2.5", "productName": "Câble électrique TH 2.5mm (100m)", "theoreticalQty": 3, "physicalQty": null }, { "productId": "prod-006", "productCode": "PVC-P-110", "productName": "Tuyau PVC Pression D110", "theoreticalQty": 2, "physicalQty": null } ] }';
INSERT INTO inventories JSON '{ "id": "132a", "reference": "INV-DMG-1754852071423", "warehouseId": "wh-002", "date": "2025-08-04T23:00:00.000Z", "status": "En cours", "type": "Spontané", "notes": "n", "items": [ { "productId": "prod-001", "productCode": "CIM-LION-42R", "productName": "Ciment ''Lion'' 42.5R", "theoreticalQty": 1, "physicalQty": null }, { "productId": "prod-002", "productCode": "TOL-BAC-2M", "productName": "Tôle Bac Acier 2m (0.35mm)", "theoreticalQty": 248, "physicalQty": null }, { "productId": "prod-003", "productCode": "PEI-SEIG-15L", "productName": "Peinture Acrylique ''Seigneurie'' Mat 15L", "theoreticalQty": 1, "physicalQty": null }, { "productId": "prod-004", "productCode": "FER-HA8", "productName": "Fer à béton HA8", "theoreticalQty": 1, "physicalQty": null }, { "productId": "prod-005", "productCode": "CAB-TH-2.5", "productName": "Câble électrique TH 2.5mm (100m)", "theoreticalQty": 3, "physicalQty": null }, { "productId": "prod-006", "productCode": "PVC-P-110", "productName": "Tuyau PVC Pression D110", "theoreticalQty": 2, "physicalQty": null } ], "createdBy": "user-001", "createdAt": "2025-08-10T18:54:31.457Z", "updatedAt": "2025-08-10T18:54:31.457Z", "itemsCount": 6, "completionPercentage": 0, "priority": "medium" }';
INSERT INTO inventories JSON '{ "id": "1242", "reference": "INV-DMG-1754854776965", "warehouseId": "wh-002", "date": "2025-08-10T19:37:57.312Z", "status": "En cours", "type": "Spontané", "notes": "", "items": [], "createdBy": "user-001", "createdAt": "2025-08-10T19:39:36.965Z", "updatedAt": "2025-08-10T19:39:36.965Z", "itemsCount": 0, "completionPercentage": 0, "priority": "medium" }';

-- Users
INSERT INTO users JSON '{ "id": "user-001", "code": "Admin", "name": "Administrateur", "title": "Superviseur Général", "profileId": "profile-admin", "creationDate": "2020-01-01T00:00:00.000Z", "email": "admin@reseau.com", "password": "admin12" }';
INSERT INTO users JSON '{ "id": "user-002", "code": "stella", "name": "STELLA", "title": "Caissière Principale", "profileId": "profile-caissiere", "creationDate": "2022-07-22T00:00:00.000Z", "email": "stella@reseau.com", "password": "password123" }';
INSERT INTO users JSON '{ "id": "user-003", "code": "julio", "name": "Julio C. MEKONTCHOU", "title": "Magasinier", "profileId": "profile-magasinier", "creationDate": "2022-07-22T00:00:00.000Z", "email": "julio@reseau.com", "password": "password123" }';
INSERT INTO users JSON '{ "id": "8373", "code": "Optimus", "name": "Abadaxx", "title": "OptimusPrime", "profileId": "profile-admin", "creationDate": "2025-07-30T13:21:06.465Z", "email": "abadaxx@reseau.com", "password": "theabada123" }';
INSERT INTO users JSON '{ "id": "1d80", "firstName": "Igor Green", "lastName": "Mogou", "email": "igormogou86@gmail.com", "company": "Personnal", "password": "123456789" }';

-- Profiles
INSERT INTO profiles JSON '{ "id": "profile-admin", "name": "DG/PDG", "description": "Accès total au système.", "permissions": { "stock_status": { "read_": true, "create_": true, "update_": true, "delete_": true }, "stock_journal": { "read_": true, "create_": true, "update_": false, "delete_": true }, "stock_entries": { "read_": true, "create_": true, "update_": false, "delete_": true }, "stock_inventory": { "read_": true, "create_": true, "update_": true, "delete_": true }, "sales_new_order": {} }, "authorizedPrices": [ "PVD", "PVDG", "PVG", "PVSG" ], "authorizedWarehouses": [ "wh-001", "wh-002", "wh-003" ], "authorizedPaymentModes": [ "CC", "CP", "CR", "CE", "VIR" ], "authorizedDiscounts": [ "Rem", "RemEx" ] }';
INSERT INTO profiles JSON '{ "id": "profile-magasinier", "name": "Magasinier", "description": "Gère les stocks et les mouvements.", "permissions": { "stock_status": { "read_": true, "create_": false, "update_": false, "delete_": false }, "stock_journal": { "read_": true, "create_": false, "update_": false, "delete_": false }, "stock_entries": { "read_": true, "create_": true, "update_": false, "delete_": false }, "stock_inventory": { "read_": true, "create_": true, "update_": true, "delete_": false } }, "authorizedPrices": [], "authorizedWarehouses": [ "wh-001", "wh-002" ], "authorizedPaymentModes": [], "authorizedDiscounts": [] }';
INSERT INTO profiles JSON '{ "id": "profile-caissiere", "name": "Caissier(e)", "description": "Gère les ventes et la facturation.", "permissions": { "sales_new_order": { "read_": true, "create_": true, "update_": false, "delete_": false } }, "authorizedPrices": [ "PVD", "PVDG" ], "authorizedWarehouses": [ "wh-001" ], "authorizedPaymentModes": [ "CP", "CE" ], "authorizedDiscounts": [ "Rem" ] }';
INSERT INTO profiles JSON '{ "id": "f857", "name": "Abdaa", "description": "AAA", "permissions": { "stock_status": { "read_": true }, "stock_journal": {}, "stock_entries": { "update_": true }, "stock_inventory": {}, "sales_new_order": { "delete_": true } }, "authorizedPrices": [], "authorizedWarehouses": [], "authorizedPaymentModes": [], "authorizedDiscounts": [] }';

-- System Audits
INSERT INTO system_audits JSON '{ "id": "audit-1", "user": "Administrateur", "action": "Accès à l''écran principal", "date": "2025-05-28T16:16:03.000Z", "remarks": "RAS" }';
INSERT INTO system_audits JSON '{ "id": "audit-2", "user": "Administrateur", "action": "Sortie normale de gestion des Catégories articles", "date": "2025-05-28T16:16:16.000Z", "remarks": "NTS" }';
INSERT INTO system_audits JSON '{ "id": "audit-3", "user": "stella", "action": "Ouverture de l''écran de saisie de Vente", "date": "2025-05-28T16:31:51.000Z", "remarks": "RAS" }';

-- Suppliers
INSERT INTO suppliers JSON '{ "id": "sup-001", "code": "CIMENCAM", "companyName": "Cimenteries du Cameroun", "contactPerson": "M. Biloa", "phone": "+237 222221133", "email": "achats.cimencam@lafarge.com", "balance": -25000000, "isActive": true }';
INSERT INTO suppliers JSON '{ "id": "sup-002", "code": "PROMETAL", "companyName": "PROMETAL Aciérie", "contactPerson": "Service Commercial", "phone": "+237 699123456", "email": "ventes@prometal.cm", "balance": 0, "isActive": true }';
INSERT INTO suppliers JSON '{ "id": "sup-003", "code": "SOFAP", "companyName": "SOFAP Peintures", "contactPerson": "Mme. Ango", "phone": "+237 677987654", "email": "contact@sofap.net", "balance": -1200000, "isActive": true }';
INSERT INTO suppliers JSON '{ "id": "sup-004", "code": "QUIFEG", "companyName": "Quincaillerie FERT GUINEA", "contactPerson": "Mamadou Diallo", "phone": "+224 622112233", "email": "info@quifeg.com", "balance": 0, "isActive": false }';

-- General Options
INSERT INTO general_options JSON '{ "id": "main", "general": { "autoInvoiceFromDelivery": true, "autoAccountingInterface": false, "autoTreasuryInterface": true, "printTradeRegistryOnInvoice": true, "useCashRegisterPrinter": false, "allowEntriesInClosedPeriod": false, "decimalPlaces": 2, "maxTechnicalMargin": 60, "dateFormat": "dd/MM/yyyy", "isSupermarket": false, "modifySalePriceOnPurchase": true }, "sales": { "canNegotiatePrice": false, "priceIncludesVAT": true, "allowMultiWarehouseSales": true, "stockValueDisplay": "%", "allowTechnicalInvoices": true, "allowDocumentChanges": false, "maxDiscountRate": 10, "cancellationDays": { "invoices": 10, "creditNotes": 9, "deliveries": 0, "purchases": 10 } }, "termInvoicing": { "vatInvoicePrefix": "", "vatInvoiceSuffix": "/04", "vatInvoiceLength": 7, "noVatInvoicePrefix": "", "noVatInvoiceSuffix": "", "noVatInvoiceLength": 7, "leftSignature": "Client", "rightSignature": "Direction", "middleSignature": "Magasinier" }, "cashInvoicing": { "vatInvoicePrefix": "", "vatInvoiceSuffix": "M/04", "vatInvoiceLength": 7, "noVatInvoicePrefix": "", "noVatInvoiceSuffix": "/NT", "noVatInvoiceLength": 7, "useCashRegisterBalance": true }, "printing": { "previewBeforePrint": true, "orientation": "Paysage", "width": 21, "height": 24, "format": "A4" } }';

-- Fiscal Years
INSERT INTO fiscal_years JSON '{ "id": "fy-2023", "name": "Exercice 2023", "startDate": "2023-01-01T00:00:00.000Z", "endDate": "2023-12-31T23:59:59.000Z", "status": "Clôturé" }';
INSERT INTO fiscal_years JSON '{ "id": "fy-2024", "name": "Exercice 2024", "startDate": "2024-01-01T00:00:00.000Z", "endDate": "2024-12-31T23:59:59.000Z", "status": "En cours" }';
INSERT INTO fiscal_years JSON '{ "id": "fy-2025", "name": "Exercice 2025", "startDate": "2025-01-01T00:00:00.000Z", "endDate": "2025-12-31T23:59:59.000Z", "status": "Clôturé" }';
INSERT INTO fiscal_years JSON '{ "id": "86cc", "name": "Exercice 2025", "startDate": "2024-12-31T23:00:00.000Z", "endDate": "2025-12-31T23:00:00.000Z", "status": "Ouvert" }';


-- #####################################################################
-- # 3. Tables du Module Banque                                        #
-- #####################################################################

CREATE TABLE IF NOT EXISTS accounting_journals (
    id TEXT PRIMARY KEY,
    name TEXT,
    code TEXT,
    type TEXT -- BANK, SALE, PURCHASE
);

CREATE TABLE IF NOT EXISTS bank_accounts (
    id TEXT PRIMARY KEY,
    name TEXT,
    bankName TEXT,
    accountNumber TEXT,
    journalId TEXT,
    currency TEXT,
    currentBalance DOUBLE
);

CREATE TABLE IF NOT EXISTS bank_statements (
    id TEXT PRIMARY KEY,
    bankAccountId TEXT,
    name TEXT,
    date TIMESTAMP,
    startBalance DOUBLE,
    endBalance DOUBLE,
    lineCount INT,
    status TEXT -- DRAFT, RECONCILED
);

CREATE TABLE IF NOT EXISTS bank_statement_lines (
    id TEXT PRIMARY KEY,
    bankStatementId TEXT,
    date TIMESTAMP,
    label TEXT,
    partnerName TEXT,
    amount DOUBLE,
    isReconciled BOOLEAN,
    reconciledPaymentId TEXT
);

-- Créez un index secondaire pour rechercher les journaux par type
CREATE INDEX IF NOT EXISTS on accounting_journals(type);
-- Créez un index secondaire pour trouver les factures par solde dû
CREATE INDEX IF NOT EXISTS on invoices(balanceDue);