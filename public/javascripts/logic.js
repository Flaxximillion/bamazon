const socket = io();
let editor;
let currData = [];
let nextID = 0;
let remove;

let updateData = {
    removed: []
};

$('.access').click(function () {
    $('.access').remove();
    socket.emit($(this).val());
});

socket.on('data', function (data, params) {
    console.log(data, params);
    switch (params){
        case 'user':
            createUserTable(data);
            break;
        case 'manager':
            createManagerTable(data);
            break;
        case 'supervisor':
            createSupervisorTable();
            break;
        default:
            break;
    }
});

function createUserTable(data) {
    for (let i = 0; i < data.length; i++) {
        data[i].purchase_amount = 0;
        currData.push(data[i]);
    }

    editor = new $.fn.dataTable.Editor({
        table: "#displayTable",
        idSrc: 'id',
        fields: [{
            name: "purchase_amount",
            label: "Purchase amount:"
        }]
    });

    $('#displayTable').DataTable({
        data: currData,
        dom: 'Bfrtip',
        columns: [{
            data: 'id',
            title: 'ID'
        }, {
            data: 'item_name',
            name: 'item_name',
            title: 'Item Name'
        }, {
            data: 'item_price',
            name: 'item_price',
            title: 'Item Price'
        }, {
            data: function(row, type, val, meta){
                    return (row.item_stock - row.purchase_amount);
            },
            name: 'item_stock',
            title: 'Stock'
        }, {
            data: 'purchase_amount',
            name: 'purchase_amount',
            editField: 'purchase_amount',
            title: 'Click to Purchase',
            className: "center"
        }],
        buttons: []
    });

    $('#displayTable').on('click', 'tbody td:nth-child(5)', function (e) {
        editor.inline(this);
    });

    editor.on('preEdit', function(e, json, data){
        let purchase = this.field('purchase_amount');

        if(parseInt(purchase.val()) > data.item_stock){
            data.purchase_amount = data.item_stock;
        }
    });

    editor.on('postEdit', function (e, data, action) {
        let submitData = data.data[0];
        submitData.item_stock -= submitData.purchase_amount;
        socket.emit('purchase', submitData);
    })
}

function createManagerTable(data){
    for (let i = 0; i < data.length; i++) {
        data[i].add_stock = 0;
        if(parseInt(data[i].id) > nextID){
            nextID = parseInt(data[i].id);
        }
        currData.push(data[i]);
    }

    editor = new $.fn.dataTable.Editor({
        table: "#displayTable",
        idSrc: 'id',
        fields: [{
            name: "item_name",
            label: "Item Name:"
        },{
            name: "item_price",
            label: "Item Price:"
        }, {
            name: "item_stock",
            label: "Item Stock:"
        }]
    });

    stockEditor = new $.fn.dataTable.Editor({
        table: "#displayTable",
        idSrc: 'id'
    });

    $('#displayTable').DataTable({
        data: currData,
        dom: 'Bfrtip',
        columns: [{
            data: 'id',
            title: 'ID'
        }, {
            data: 'item_name',
            name: 'item_name',
            title: 'Item Name'
        }, {
            data: 'item_price',
            name: 'item_price',
            editField: 'item_price',
            title: 'Click to Change Item Price'
        }, {
            data: 'item_stock',
            name: 'item_stock',
            title: 'Stock'
        }, {
            data: 'item_purchased',
            name: 'item_purchased',
            title: 'Units Purchased by Customers'
        },{
            data: 'add_stock',
            name: 'add_stock',
            editField: 'add_stock',
            title: 'Click to Add Stock to the Inventory',
            className: "center"
        }, {
            data: 'item_revenue',
            name:'item_revenue',
            title: 'Total Item Revenue'
        }, {
            data: null,
            className: "center",
            defaultContent: "<a href='' class='editor_delete'>Delete Item</a> "
        }],
        buttons: [{
            extend: 'create',
            editor: editor
        }, {
            text: 'Submit Changes',
            action: function(e, dt, node, config){
                submitChanges()
    }
        }]
    });

    $('#displayTable').on('click', 'tbody td:nth-child(6)', function (e) {
        stockEditor.clear().add({
            label: 'Add Stock',
            name: 'add_stock'
        }).inline(this);
    });


    $('#displayTable').on('click', 'tbody td:nth-child(3)', function (e) {
        stockEditor.clear().add({
            label: 'Change Value',
            name: 'item_price'
        }).inline(this);
    });

    stockEditor.on('preEdit', function (e, json, data) {
        console.log(data);
        data.item_stock = parseInt(data.item_stock) + parseInt(data.add_stock);
        data.add_stock = 0;
        data.item_price = currencyFormat.format(Number(data.item_price.replace(/[^0-9\.]+/g, "")));
        console.log(data);
    });

    editor.on('preCreate', function(e, json, data){
        data.id=nextID + 1;
        data.add_stock = 0;
        data.item_purchased = 0;
        data.item_revenue= 0;
        data.item_price = currencyFormat.format(Number(data.item_price.replace(/[^0-9\.]+/g, "")));
    });

    stockEditor.on('postEdit', function(e, data, action){
        parseUpdateData(data.data[0]);
    });

    editor.on('initRemove', function(e, node, data){
        remove = data[0].item_name;
    });

    editor.on('postCreate', function(e, data, action){
        nextID++;
        parseUpdateData(data.data[0]);
    });

    editor.on('postRemove', function(e, json){
        if(updateData.hasOwnProperty(remove)){
            delete updateData[remove];
        } else {
            updateData['removed'].push(remove);
        }
    });

    function parseUpdateData(data){
        let submitData = data;

        updateData[submitData.id] = submitData;
    }

    $('#displayTable').on('click', 'a.editor_delete', function(e){
        e.preventDefault();

        editor.remove($(this).closest('tr'),{
            title: 'Delete Item',
            message: "Bro are you sure? There's no control+z for this.",
            buttons: 'Delete'
        });
    });
}

function submitChanges(){
    console.log(updateData);
    socket.emit('managerUpdate', updateData);
    updateData = {
        removed: []
    };
}

let currencyFormat = new Intl.NumberFormat('en-us', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});