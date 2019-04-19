"use strict";

export default class TableVanilla {

    constructor(selector, options) {

        let container = selector instanceof HTMLElement
            ? selector
            : document.querySelector(selector);

        if (!container || container.length === 0) {
            throw "invalid container provided";
        }

        this.options = Object.assign({}, container.dataset, options);
        this.url = new URL(this.options.url, location.origin);

        this.dataset = {
            page: 1,
            sort: container.dataset.sortName,
            order: container.dataset.sortOrder,
            limit: +container.dataset.pageSize
        };

        if (location.hash) {
            this.dataset = Object.assign(
                this.dataset,
                Object.fromEntries(
                    location.hash
                        .split('#')[1]
                        .split('&')
                        .map(el => el.split('='))
                )
            );
        }
        this.render(container);
    }

    async render(container) {
        this.headers = Object.assign(
            ...this.options.columns
                .split(',')
                .map(col => {
                    let name = col.split('=');
                    return {[name[0]]:  name[1] || name[0].replace('_', ' ')}
                })
        );

        let table = document.createElement('table');
        let thead = document.createElement('thead');
        let controls = document.createElement('span');
        this.tbody = document.createElement('tbody');
        this.metaData = document.createElement('span');
        this.pagination = document.createElement('ul');
        table.classList.add('stripped');
        controls.classList.add('meta');
        this.metaData.classList.add('meta');
        this.pagination.classList.add('pagination');

        thead.innerHTML = `<tr>
            ${Object.entries(this.headers)
                .map(([column, label]) =>
                    `<th><a class="both ${column === this.dataset.sort ? this.dataset.order : ''}" href="#sort-${column}">
                        ${label}
                    </a></th>`
                )
                .concat(this.options.customFields.map(({name}) => `<th><div>${name}</div></th>`))
                .join('')}
        </tr>`;

        controls.innerHTML = `<select>
            ${JSON.parse(this.options.pageList).map(el =>
                `<option ${el === +this.dataset.limit ? 'selected' : ''} value="${el}">${el}</option>`
            ).join('')}
        </select> rows per page`;


        thead.addEventListener('click', e => {
            e.preventDefault();
            document.getElementsByClassName(this.dataset.order)[0].classList.remove(this.dataset.order);
            e.target.hash ? this.handleSorting(e.target.hash.split('-')[1]) : false;
            e.target.classList.add(this.dataset.order);
        });
        controls.addEventListener('change', e => this.setPageSize(e.target.value));
        this.pagination.addEventListener('click', e => {
            e.preventDefault();
            e.target.hash ? this.handlePagination(e.target.hash.split('-')[1]) : false;
        });

        table.append(thead, this.tbody);
        container.append(table, this.metaData, controls, this.pagination);

        this.renderPage();
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

    handlePagination(page) {
        this.dataset.page = page;
        this.renderPage();
    }

    handleSorting(column) {
        if (this.dataset.sort !== column) {
            this.dataset.sort = column;
        } else {
            this.dataset.order = this.dataset.order === 'desc' ? 'asc' : 'desc';
        }
        this.renderPage();
    }

    setPageSize(size) {
        this.dataset.limit = size;
        this.dataset.page = 1;
        this.renderPage();
    }

    async renderPage() {
        if (this.controller) {
            this.controller.abort();
        }
        this.dataset.page = parseInt(this.dataset.page) || 1;
        let offset = (this.dataset.page - 1) * this.dataset.limit;

        let data = await this.getData({...this.dataset, offset});
        if (data) {
            this.tbody.innerHTML = Object.values(data.rows).map(row =>
                `<tr>
                    ${Object.keys(this.headers).map(el =>
                        `<td class="${row[el]}" title="${row[el]}">${row[el]}</td>`
                    ).join('')}
                    ${this.options.customFields.map(el =>
                        `<td class="${el.name}">${el.callback(row)}</td>`
                    ).join('')}
                </tr>`
            ).join('');

            this.renderMeta(offset, +this.dataset.limit, +data.total);
            this.renderPagination(+this.dataset.page, Math.ceil(data.total/this.dataset.limit));
            if (this.options.deepLinking === "on") {
                location.hash = Object.entries(this.dataset).map(el => el.join('=')).join('&');
            }
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