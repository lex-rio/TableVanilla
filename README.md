# TableVanilla
Work with table without dependencies 

# Examples

```HTML
<div id="table-id"
     data-url="/portal.php/a2o/campaigns"
     data-columns="id=#,col1=colName,col_name,col3,col4=last update"
     data-page-size="10"
     data-page-list="[5, 10, 25, 100]"
     data-sort-name="id"
     data-sort-order="desc"></div>
```

```JS
new TableVanilla('#table-id');
```
```JS
new TableVanilla(document.querySelector('#table-id'));
```

```JS
new TableVanilla(document.querySelector('#table-id'), {
    customFields: [{
        name: 'actions',
        callback: row => row.status === 'draft' ? `<a>aprove</a>` : `<a>draft</a>`
    }]
});
```
