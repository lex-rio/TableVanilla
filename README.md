# TableVanilla
Work with table without dependencies 
Supports Ajax pajination and deeplinking

# Examples

```HTML
<div id="table-id"
     data-url="/portal.php/a2o/campaigns"
     data-columns="id=#,col1=colName,col_name,col3,col4=last update"
     data-page-size="10"
     data-page-list="[5, 10, 25, 100]"
     data-deep-linking="on"
     data-sort-by="id"
     data-order="desc"></div>
```

## header render
```HTML
<thead>
     <tr>
          <th>
               <a class="both desc" href="#sort-id">#</a>
          </th>
          <th>
               <a class="both " href="#sort-col1">colName</a>
          </th>
          <th>
               <a class="both " href="#sort-col_name">col name</a>
          </th>
          <th>
               <a class="both " href="#sort-col3">col3</a>
          </th>
          <th>
               <a class="both " href="#sort-col4">last update</a>
          </th>
          <th>
               <div>actions</div>
          </th>
     </tr>
</thead>
```

## JS
```JS
import TableVanilla from './TableVanilla.js';

new TableVanilla('#table-id');
```
```JS
import TableVanilla from './TableVanilla.js';

new TableVanilla(document.querySelector('#table-id'));
```

## You can redefine data properties in options object

```JS
import TableVanilla from './TableVanilla.js';

new TableVanilla(document.querySelector('#table-id'), {
    customFields: [{
        name: 'actions',
        callback: row => row.status === 'draft' ? `<a>aprove</a>` : `<a>draft</a>`
    }], 
    sortBy: 'col4'
});
```

