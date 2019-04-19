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

        table.append(thead);
        table.append(this.tbody);
        container.append(table);
        container.append(this.metaData);
        container.append(controls);
        container.append(this.pagination);

        this.renderPage();
    }

    renderMeta() {
        let lower = (this.dataset.page - 1) * this.dataset.limit + 1,
            upper = lower - 1 + parseInt(this.dataset.limit);
        this.metaData.innerText = `Showing ${lower} to ${upper > this.total ? this.total : upper} of ${this.total} rows`;
    }

    renderPagination(page = 1, pagesCount) {
        let leftArrow = `<li><a href="#page-${page === 1 ? pagesCount : page-1}">‹</a></li>`;
        let rightArrow = `<li><a href="#page-${page === pagesCount ? 1 : page+1}">›</a></li>`;

        this.pagination.innerHTML = leftArrow + getPages(page, pagesCount).map(item => item === '...'
            ? `<li class="disabled"><a>...</a></li>`
            : `<li class="${page === item ? 'active' : ''}">
                <a href="#page-${item}">${item}</a>
            </li>`).join('') + rightArrow;
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

    setPageSize(size = 10) {
        this.dataset.limit = size;
        this.dataset.page = 1;
        this.renderPage();
    }

    async renderPage() {
        if (this.controller) {
            this.controller.abort();
        }

        let data = await this.getData(this.dataset);
        if (!data) {
            return;
        }
        this.total = data.total;

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

        this.renderMeta();
        this.renderPagination(+this.dataset.page, Math.ceil(this.total/this.dataset.limit));
        location.hash = Object.entries(this.dataset).map(el => el.join('=')).join('&');
    }

    async getData(params) {
        Object.entries(params).map(el => this.url.searchParams.set(...el));
        this.url.searchParams.set('offset', (params.page - 1) * params.limit);
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
    let startAt = current - Math.floor(paginSize/2);
    let list = range(paginSize, startAt);

    if (list[paginSize-1] > last) {
        list = list.slice(0, last - list[paginSize-1]);
    } else if (list[0] < 1) {
        list = list.slice(Math.abs(list[0]) + 1)
    }

    if (!list.includes(last)) {
        if (list[paginSize - 1] + 1 !== last) {
            list.push('...');
        }
        list.push(last);
    }

    if (!list.includes(1)) {
        if (list[0] - 1 !== 1) {
            list.unshift('...');
        }
        list.unshift(1);
    }

    return list;
}
