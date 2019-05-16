"use strict";

export default class TableVanilla {

    constructor(selector, options, data) {

        let container = selector instanceof HTMLElement
            ? selector
            : document.querySelector(selector);

        if (!container || container.length === 0) {
            throw "invalid container provided";
        }

        this.options = {
            pagination: "client",
            pageList: "[10,25,50,100]",
            pageSize: 10,
            deepLinking: "on",
            url: "/",
            sortOrder: "asc",
            sortName: "id",
            ...container.dataset,
            ...options
        };

        if (data) {
            this.data = Object.values(data);
            this.total = this.data.length;
            this.options.pagination = 'client';
        }

        this.url = new URL(this.options.url, location.origin);

        this.dataset = {
            page: 1,
            sort: this.options.sortName,
            order: this.options.sortOrder,
            limit: +this.options.pageSize
        };

        if (location.hash) {
            this.dataset = {
                ...this.dataset,
                ...Object.fromEntries(
                    location.hash.split('#')[1]
                        .split('&')
                        .map(el => el.split('='))
                )
            };
        }
        this.render(container);
    }

    async render(container) {
        let table = document.createElement('table'),
            controls = document.createElement('span');

        this.thead = document.createElement('thead');
        this.tbody = document.createElement('tbody');
        this.meta = document.createElement('span');
        this.pagination = document.createElement('ul');

        table.classList.add('stripped');
        controls.classList.add('meta');
        this.meta.classList.add('meta');
        this.pagination.classList.add('pagination');

        if (this.options.columns) {
            this.renderHeader(this.options.columns.split(',').map(col => col.split('=')));
        }

        controls.innerHTML = `<select>
            ${JSON.parse(this.options.pageList).map(el =>
                `<option ${el === +this.dataset.limit ? 'selected' : ''} value="${el}">${el}</option>`
            ).join('')}
        </select> rows per page`;

        // handlers
        controls.addEventListener('change', e =>
            e.preventDefault() || this.updatePageSize(e.target.value)
        );
        this.thead.addEventListener('click', e =>
            e.preventDefault() || e.target.hash && this.resort(e.target.hash.split('-')[1])
        );
        this.pagination.addEventListener('click', e =>
            e.preventDefault() || e.target.hash && this.renderPage(e.target.hash.split('-')[1])
        );

        table.append(this.thead, this.tbody);
        container.append(table, this.meta, controls, this.pagination);

        this.renderPage();
    }

    updatePageSize(size) {
        this.dataset.limit = size;
        this.renderPage(1);
    }

    async resort(sort, order) {
        this.thead.getElementsByClassName(this.dataset.order)[0].classList.remove(this.dataset.order);
        order = order || this.dataset.order === 'desc' ? 'asc' : 'desc';
        const update = this.dataset.sort !== sort ? {sort} : {order};
        this.dataset = {...this.dataset, ...update};
        await this.renderPage();
        this.thead.getElementsByClassName(`header-${sort}`)[0].classList.add(this.dataset.order)
    }

    renderHeader(columns) {
        if (!this.thead.innerHTML) {
            this.columns = columns;
            this.thead.innerHTML = `<tr>
                ${columns.map(([key, label]) =>
                    `<th><a class="header-${key} ${key === this.dataset.sort ? this.dataset.order : ''}" href="#sort-${key}">
                        ${label || key.replace('_', ' ')}
                    </a></th>`
                )
                .concat(this.options.customFields.map(({name}) => `<th><div>${name}</div></th>`))
                .join('')}
            </tr>`;
        }
    }

    renderMeta(lower, pageSize, rowsCount) {
        const upper = lower + pageSize;
        this.meta.innerText = `Showing ${++lower} to ${upper > rowsCount ? rowsCount : upper} of ${rowsCount} rows`;
    }

    renderPagination(page = 1, pagesCount) {
        this.pagination.innerHTML =
            `<li><a href="#page-${page === 1 ? pagesCount : page-1}">‹</a></li>`
            + TableVanilla.getPages(page, pagesCount).map(item =>
                item === '...'
                    ? `<li class="disabled"><a>...</a></li>`
                    : `<li class="${page === item ? 'active' : ''}"><a href="#page-${item}">${item}</a></li>`
            ).join('')
            + `<li><a href="#page-${page === pagesCount ? 1 : page+1}">›</a></li>`;
    }

    async renderPage(page) {
        this.dataset.page = +page || +this.dataset.page;

        let offset = (this.dataset.page - 1) * this.dataset.limit,
            rows = await this.getData({...this.dataset, offset});

        if (!rows || !rows.length) {
            return this.tbody.innerHTML = 'Empty set';
        }

        this.renderHeader(Object.keys(rows[0]).map(name => [name]));
        this.tbody.innerHTML = rows.map(row =>
            `<tr>
                ${this.columns.map(([col]) =>
                    `<td class="${row[col]}" title="${row[col]}">${row[col]}</td>`
                ).join('')}
                ${this.options.customFields.map(col =>
                    `<td class="${col.name}">${col.callback(row)}</td>`
                ).join('')}
            </tr>`
        ).join('');

        this.renderMeta(offset, +this.dataset.limit, +this.total);
        this.renderPagination(this.dataset.page, Math.ceil(this.total/this.dataset.limit));
        if (this.options.deepLinking === "on") {
            location.hash = Object.entries(this.dataset).map(el => el.join('=')).join('&');
        }
    }

    async getData(dataset) {
        if (this.options.pagination !== "client" || !this.data) {
            if (this.controller) {
                this.controller.abort();
            }
            let params = this.options.pagination !== "client" ? dataset : {sort: dataset.sort, order: dataset.order};

            Object.entries(params).map(el => this.url.searchParams.set(...el));
            try {
                this.controller = new AbortController();
                let response = await fetch(this.url, {signal: this.controller.signal});
                let {rows, total} = await response.json();
                this.data = Object.values(rows);
                this.total = total;
            } catch (e) {
                console.log('Download aborted');
            }
        }
        return this.options.pagination !== "client"
            ? this.data
            : this.data.sort((a, b) => {
                return (dataset.order === 'asc' ? 1 : -1)
                    *
                    (isNaN(a[dataset.sort] - b[dataset.sort])
                    ? a[dataset.sort] === b[dataset.sort] ? 0 : a[dataset.sort] > b[dataset.sort] ? 1 : -1
                    : a[dataset.sort] - b[dataset.sort]);
            }).slice(dataset.offset, dataset.offset + +dataset.limit);
    }

    static getPages(current, last, paginSize = 5) {
        let list = Array.from(new Set(
            [1, ...range(paginSize, current - Math.floor(paginSize/2)).filter(i => i>0 && i<=last), last]
        ));
        if (list[1] && list[0]+1 !== list[1]) {
            list.splice(1, 0, '...');
        }
        if (list[list.length-2] && list[list.length-2]+1 !== list[list.length-1]) {
            list.splice(-1, 0, '...');
        }
        return list;
    }
}

const range = (size, startAt = 0) => [...Array(size).keys()].map(i => i+startAt);