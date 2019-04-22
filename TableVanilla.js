"use strict";

export default class TableVanilla {

    constructor(selector, options) {

        let container = selector instanceof HTMLElement
            ? selector
            : document.querySelector(selector);

        if (!container || container.length === 0) {
            throw "invalid container provided";
        }

        this.options = {
            pageList: "[10,25,50,100]",
            pageSize: 10,
            deepLinking: "on",
            url: "/",
            sortOrder: "asc",
            sortName: "id",
            ...container.dataset,
            ...options
        };

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
        this.metaData = document.createElement('span');
        this.pagination = document.createElement('ul');

        table.classList.add('stripped');
        controls.classList.add('meta');
        this.metaData.classList.add('meta');
        this.pagination.classList.add('pagination');

        if (this.options.columns) {
            this.renderHeader(this.options.columns.split(',').map(col => col.split('=')));
        }

        controls.innerHTML = `<select>
            ${JSON.parse(this.options.pageList).map(el =>
                `<option ${el === +this.dataset.limit ? 'selected' : ''} value="${el}">${el}</option>`
            ).join('')}
        </select> rows per page`;

        this.addHandlers(this.thead, controls, this.pagination);
        table.append(this.thead, this.tbody);
        container.append(table, this.metaData, controls, this.pagination);

        this.renderPage(this.dataset.page);
    }

    addHandlers(thead, controls, pagination) {
        thead.addEventListener('click', async e => {
            if (!e.target.hash) {
                return;
            }
            e.preventDefault();
            document.getElementsByClassName(this.dataset.order)[0].classList.remove(this.dataset.order);
            let column = e.target.hash.split('-')[1];
            if (this.dataset.sort !== column) {
                this.dataset.sort = column;
            } else {
                this.dataset.order = this.dataset.order === 'desc' ? 'asc' : 'desc';
            }
            await this.renderPage(this.dataset.page);
            e.target.classList.add(this.dataset.order);
        });
        controls.addEventListener('change', e => {
            this.dataset.limit = e.target.value;
            this.renderPage();
        });
        pagination.addEventListener('click', e => e.target.hash && this.renderPage(e.target.hash.split('-')[1]));
    }

    renderHeader(columns) {
        if (!this.thead.innerHTML) {
            this.columns = columns;
            this.thead.innerHTML = `<tr>
                ${columns.map(([key, label]) =>
                    `<th><a class="${key === this.dataset.sort ? this.dataset.order : ''}" href="#sort-${key}">
                        ${label || key.replace('_', ' ')}
                    </a></th>`
                )
                .concat(this.options.customFields.map(({name}) => `<th><div>${name}</div></th>`))
                .join('')}
            </tr>`;
        }
    }

    renderMeta(lower, pageSize, rowsCount) {
        let upper = lower + pageSize;
        this.metaData.innerText = `Showing ${++lower} to ${upper > rowsCount ? rowsCount : upper} of ${rowsCount} rows`;
    }

    renderPagination(page = 1, pagesCount) {
        this.pagination.innerHTML =
            `<li><a href="#page-${page === 1 ? pagesCount : page-1}">‹</a></li>`
            + getPages(page, pagesCount).map(item =>
                item === '...'
                    ? `<li class="disabled"><a>...</a></li>`
                    : `<li class="${page === item ? 'active' : ''}"><a href="#page-${item}">${item}</a></li>`
            ).join('')
            + `<li><a href="#page-${page === pagesCount ? 1 : page+1}">›</a></li>`;
    }

    async renderPage(page = 1) {
        if (this.controller) {
            this.controller.abort();
        }
        this.dataset.page = +page || 1;

        let offset = (page - 1) * this.dataset.limit,
            data = await this.getData({...this.dataset, offset});

        if (!data || !data.rows) {
            return this.tbody.innerHTML = 'Empty set';
        }
        this.renderHeader(Object.keys(data.rows[0]).map(name => [name]));
        this.tbody.innerHTML = data.rows.map(row =>
            `<tr>
                ${this.columns.map(([col]) =>
                    `<td class="${row[col]}" title="${row[col]}">${row[col]}</td>`
                ).join('')}
                ${this.options.customFields.map(col =>
                    `<td class="${col.name}">${col.callback(row)}</td>`
                ).join('')}
            </tr>`
        ).join('');

        this.renderMeta(offset, +this.dataset.limit, +data.total);
        this.renderPagination(this.dataset.page, Math.ceil(data.total/this.dataset.limit));
        if (this.options.deepLinking === "on") {
            location.hash = Object.entries(this.dataset).map(el => el.join('=')).join('&');
        }
    }

    async getData(params) {
        Object.entries(params).map(el => this.url.searchParams.set(...el));
        try {
            this.controller = new AbortController();
            let response = await fetch(this.url, {signal: this.controller.signal});
            return await response.json();
        } catch (e) {
            console.log('Download aborted');
        }
    }
}

const range = (size, startAt = 0) => [...Array(size).keys()].map(i => i+startAt);

function getPages(current, last, paginSize = 5) {
    let list = Array.from(new Set(
        [1, ...range(paginSize, current - Math.floor(paginSize/2)).filter(i => i>0 && i<=last), last]
    ));
    if (list[0]+1 !== list[1]) {
        list.splice(1, 0, '...');
    }
    if (list[list.length-2]+1 !== list[list.length-1]) {
        list.splice(-1, 0, '...');
    }
    return list;
}