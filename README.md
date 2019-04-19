# TableVanilla
Work with table without dependencies 

# Examples

```HTML
<div id="campaigns_list"
     data-url="/portal.php/a2o/campaigns"
     data-columns="id=#,name,tracking_code,status,updated_at=last update"
     data-page-size="10"
     data-page-list="[5, 10, 25, 100]"
     data-sort-name="id"
     data-sort-order="desc"></div>
```

```JS
new TableVanilla('#campaigns_list');
```

```JS
new TableVanilla('#campaigns_list', {
    customFields: [{
        name: 'actions',
        callback: row => row.status === 'draft' ? `<a>aprove</a>` : `<a>draft</a>`
    }]
});
```
