class UIManager {
    constructor(dataManager, mainInstance) {
        this.dataManager = dataManager;
        this.main = mainInstance;
        
        const savedSortState = localStorage.getItem('amazon_dashboard_sort_state');
        this.sortState = savedSortState ? JSON.parse(savedSortState) : {
            column: 'date',
            direction: 'asc'
        };
        
        const savedForecastSortState = localStorage.getItem('amazon_dashboard_forecast_sort_state');
        this.forecastSortState = savedForecastSortState ? JSON.parse(savedForecastSortState) : {
            column: 'total',
            direction: 'desc'
        };
    }

    updateUI(currentPeriod, currentSubPeriod) {
        this.updatePeriodSelector(currentPeriod);
        this.updateSubPeriodSelector(currentPeriod, currentSubPeriod);
        this.updateSummaryCards(currentPeriod, currentSubPeriod);
        this.updateTables(currentPeriod, currentSubPeriod);
    }

    updatePeriodSelector(currentPeriod) {
        const selector = document.getElementById('periodSelector');
        selector.innerHTML = '';

        const periodEntries = Array.from(this.dataManager.periods.entries()).sort((a, b) => {
            const parseDate = (period) => {
                const match = period.match(/(\d+)年(\d+)月/);
                if (!match) return 0;
                return parseInt(match[1]) * 100 + parseInt(match[2]);
            };
            return parseDate(a[0]) - parseDate(b[0]);
        });
        
        periodEntries.forEach(([period, data], index) => {
            const button = document.createElement('button');
            button.className = 'period-button';
            button.textContent = period;
            button.onclick = () => this.main.switchPeriod(period);
            
            if (period === currentPeriod) {
                button.classList.add('active');
            }
            
            selector.appendChild(button);
        });

        const allButton = document.createElement('button');
        allButton.className = 'period-button';
        allButton.textContent = '全期間';
        allButton.onclick = () => this.main.switchPeriod('all');
        if (currentPeriod === 'all') {
            allButton.classList.add('active');
        }
        selector.appendChild(allButton);
    }

    updateSubPeriodSelector(currentPeriod, currentSubPeriod) {
        const selector = document.getElementById('subPeriodSelector');
        if (!selector) return;

        if (currentPeriod === 'all') {
            selector.style.display = 'none';
            return;
        }

        selector.style.display = 'flex';
        selector.style.gap = '10px';
        selector.style.marginBottom = '20px';
        selector.style.justifyContent = 'center';
        selector.innerHTML = '';

        const periods = [
            { id: 'all', label: '全期間' },
            { id: 'early', label: '前期 (1-10日)' },
            { id: 'middle', label: '中期 (11-20日)' },
            { id: 'late', label: '後期 (21-31日)' }
        ];

        periods.forEach(p => {
            const button = document.createElement('button');
            button.className = 'period-button sub-period-button';
            if (currentSubPeriod === p.id) {
                button.classList.add('active');
            }
            button.textContent = p.label;
            button.onclick = () => this.main.switchSubPeriod(p.id);
            
            button.style.fontSize = '0.9rem';
            button.style.padding = '6px 12px';
            
            selector.appendChild(button);
        });
    }

    updateSummaryCards(currentPeriod, currentSubPeriod) {
        const data = this.dataManager.getCurrentData(currentPeriod, currentSubPeriod);
        
        document.getElementById('totalSales').textContent = this.formatCurrency(data.totalSales);
        document.getElementById('totalSalesFees').textContent = this.formatCurrency(data.totalSalesFees || data.totalFees);
        
        const gross = (data.totalSales || 0) - (data.totalSalesFees || data.totalFees || 0);
        const grossEl = document.getElementById('grossProfit');
        if (grossEl) grossEl.textContent = this.formatCurrency(gross);
        
        const gm = (data.totalSales || 0) > 0 ? (gross / data.totalSales * 100).toFixed(1) : 0;
        const gmEl = document.getElementById('grossMargin');
        if (gmEl) gmEl.textContent = gm + '%';
        
        document.getElementById('totalExpenses').textContent = this.formatCurrency(data.totalExpenses || data.totalFees);
        document.getElementById('totalProfit').textContent = this.formatCurrency(data.totalProfit);
        
        const profitMarginRate = (data.totalSales || 0) > 0 ? (data.totalProfit / data.totalSales * 100).toFixed(1) : 0;
        const profitMarginEl = document.getElementById('profitMargin');
        if (profitMarginEl) profitMarginEl.textContent = profitMarginRate + '%';
        
        const shippingFeesEl = document.getElementById('shippingFees');
        if (shippingFeesEl) shippingFeesEl.textContent = this.formatCurrency(data.fbaFeeBreakdown.shippingFees || 0);
        
        const storageFeesEl = document.getElementById('storageFees');
        if (storageFeesEl) storageFeesEl.textContent = this.formatCurrency(data.fbaFeeBreakdown.storageFees || 0);
        
        const advertisingFeesEl = document.getElementById('advertisingFees');
        if (advertisingFeesEl) advertisingFeesEl.textContent = this.formatCurrency(data.fbaFeeBreakdown.advertisingFees || 0);
        
        const couponFeesEl = document.getElementById('couponFees');
        if (couponFeesEl) couponFeesEl.textContent = this.formatCurrency(data.fbaFeeBreakdown.couponFees || 0);
        
        const marketplaceFeesEl = document.getElementById('marketplaceFees');
        if (marketplaceFeesEl) marketplaceFeesEl.textContent = this.formatCurrency(data.fbaFeeBreakdown.marketplaceFees || 0);
        
        const refundRate = (data.totalSales || 0) > 0 ? (data.totalRefunds / data.totalSales * 100).toFixed(1) : 0;
        const refundRateEl = document.getElementById('refundRate');
        if (refundRateEl) refundRateEl.textContent = refundRate + '%';
        
        document.getElementById('orderCount').textContent = data.orderCount.toLocaleString();
        const refundCountEl = document.getElementById('refundCount');
        if (refundCountEl) refundCountEl.textContent = (data.refundCount || 0).toLocaleString();
        
        document.getElementById('totalRefunds').textContent = this.formatCurrency(data.totalRefunds);
        document.getElementById('transactionCount').textContent = data.transactionCount.toLocaleString() + '件';

        const vineCountEl = document.getElementById('vineCount');
        if (vineCountEl) vineCountEl.textContent = (data.vineData ? data.vineData.count : 0).toLocaleString();
        
        const vineTotalAmountEl = document.getElementById('vineTotalAmount');
        if (vineTotalAmountEl) vineTotalAmountEl.textContent = this.formatCurrency(data.vineData ? data.vineData.totalAmount : 0);

        const multiChannelCountEl = document.getElementById('multiChannelCount');
        if (multiChannelCountEl) multiChannelCountEl.textContent = (data.multiChannelData ? data.multiChannelData.count : 0).toLocaleString();
        
        const multiChannelAmountEl = document.getElementById('multiChannelAmount');
        if (multiChannelAmountEl) {
            multiChannelAmountEl.textContent = this.formatCurrency(data.multiChannelData ? data.multiChannelData.totalAmount : 0);
            multiChannelAmountEl.style.color = 'var(--danger-color)';
            multiChannelAmountEl.style.fontWeight = '600';
        }

        const profitElement = document.getElementById('totalProfit');
        const profitChangeElement = document.getElementById('profitChange');
        if (data.totalProfit >= 0) {
            profitElement.style.color = 'var(--success-color)';
            profitChangeElement.className = 'card-change positive';
        } else {
            profitElement.style.color = 'var(--danger-color)';
            profitChangeElement.className = 'card-change negative';
        }

        const salesBreakdown = data.salesBreakdown || { productPrice: 0, otherAmount: 0 };
        this.attachSummaryTooltip('totalSales', [
            { label: '商品価格合計', value: salesBreakdown.productPrice },
            { label: 'その他', value: salesBreakdown.otherAmount }
        ]);
        
        const salesFeeBreakdown = data.salesFeeBreakdown || { promotionDiscount: 0, amazonFees: 0, multiChannelFees: 0 };
        this.attachSummaryTooltip('totalSalesFees', [
            { label: 'プロモーション割引合計', value: salesFeeBreakdown.promotionDiscount },
            { label: 'Amazon手数料', value: salesFeeBreakdown.amazonFees },
            { label: 'マルチチャネル配送手数料', value: salesFeeBreakdown.multiChannelFees }
        ]);
        this.attachSummaryTooltip('totalExpenses', [
            { label: '売上手数料', value: data.totalSalesFees || data.totalFees },
            { label: 'その他手数料合計', value: data.totalFbaFees || 0 }
        ]);
        
        const orderBreakdown = data.orderBreakdown || { amazonOrders: 0, multiChannelOrders: 0 };
        this.attachOrderTooltip('orderCount', [
            { label: 'Amazon販売', value: orderBreakdown.amazonOrders },
            { label: 'マルチチャネル配送', value: orderBreakdown.multiChannelOrders }
        ]);
    }

    updateTables(currentPeriod, currentSubPeriod) {
        const data = this.dataManager.getCurrentData(currentPeriod, currentSubPeriod);
        this.updateDailyTable(data);
        this.updateTransactionTable(data);
        this.updateProductTable(data);
        this.updateProductNetProfitTable(data);
        this.updateProductFeeTable(data);
        this.updateFbaTable(data);
        this.updateMultiChannelTable(data);
        this.updateInventoryForecastTable();
    }

    updateDailyTable(data) {
        const tbody = document.querySelector('#dailyTable tbody');
        tbody.innerHTML = '';

        const dailyDataArray = Object.keys(data.dailyData).map(date => {
            const dayData = data.dailyData[date];
            return {
                date: date,
                sales: dayData.sales,
                fees: dayData.fees,
                profit: dayData.profit,
                margin: dayData.sales > 0 ? (dayData.profit / dayData.sales * 100) : 0,
                orders: dayData.orders.size
            };
        }).filter(dayData => {
            return !(dayData.sales === 0 && dayData.fees === 0 && dayData.profit === 0 && dayData.orders === 0);
        });

        this.sortDailyData(dailyDataArray);

        dailyDataArray.forEach(dayData => {
            const row = tbody.insertRow();
            
            row.insertCell(0).textContent = dayData.date;
            row.insertCell(1).textContent = this.formatCurrency(dayData.sales);
            row.insertCell(2).textContent = this.formatCurrency(dayData.fees);
            
            const profitCell = row.insertCell(3);
            profitCell.textContent = this.formatCurrency(dayData.profit);
            profitCell.className = dayData.profit >= 0 ? 'profit-positive' : 'profit-negative';
            
            const marginCell = row.insertCell(4);
            marginCell.textContent = dayData.margin.toFixed(1) + '%';
            
            row.insertCell(5).textContent = dayData.orders;
        });

        this.updateSortIndicators();
    }

    updateTransactionTable(data) {
        const tbody = document.querySelector('#transactionTable tbody');
        tbody.innerHTML = '';

        const totalAmount = Object.values(data.transactionTypes)
            .reduce((sum, type) => sum + Math.abs(type.amount), 0);

        Object.entries(data.transactionTypes)
            .sort((a, b) => Math.abs(b[1].amount) - Math.abs(a[1].amount))
            .forEach(([type, typeData]) => {
                const row = tbody.insertRow();
                const displayType = type === 'サービス料金' ? 
                    'サービス料金（月額登録料、FBA保管手数料、納品時の輸送手数料など）' : type;
                row.insertCell(0).textContent = displayType;
                row.insertCell(1).textContent = typeData.count;
                
                const amountCell = row.insertCell(2);
                amountCell.textContent = this.formatCurrency(typeData.amount);
                if (type === 'マルチチャネル取引' || type === 'マーケットプレイス配送サービス') {
                    amountCell.className = 'profit-negative';
                } else if (type === '注文に対する支払い（商品価格合計）' || type === '注文に対する支払い（その他）') {
                    amountCell.className = 'profit-positive';
                } else {
                    amountCell.className = typeData.amount >= 0 ? 'profit-positive' : 'profit-negative';
                }
                
                const percentCell = row.insertCell(3);
                const percent = totalAmount > 0 ? 
                    (Math.abs(typeData.amount) / totalAmount * 100).toFixed(1) : 0;
                percentCell.textContent = percent + '%';
            });
    }

    updateProductTable(data) {
        const tbody = document.querySelector('#productTable tbody');
        tbody.innerHTML = '';

        Object.entries(data.productData)
            .sort((a, b) => b[1].sales - a[1].sales)
            .slice(0, 20)
            .forEach(([product, productData]) => {
                const setting = this.dataManager.productSettings[product] || {};
                const displayName = setting.fullName || product;

                const row = tbody.insertRow();
                
                const nameCell = row.insertCell(0);
                nameCell.className = 'product-name-cell';
                const div = document.createElement('div');
                div.className = 'name-wrapper';
                
                const textDiv = document.createElement('div');
                textDiv.className = 'name-text';
                textDiv.textContent = displayName;
                
                const hoverDiv = document.createElement('div');
                hoverDiv.className = 'name-hover';
                hoverDiv.textContent = displayName;
                
                div.appendChild(textDiv);
                div.appendChild(hoverDiv);
                div.title = displayName;
                nameCell.appendChild(div);

                row.insertCell(1).textContent = this.formatCurrency(productData.sales);
                row.insertCell(2).textContent = this.formatCurrency(productData.fees);
                
                const profitCell = row.insertCell(3);
                profitCell.textContent = this.formatCurrency(productData.profit);
                profitCell.className = productData.profit >= 0 ? 'profit-positive' : 'profit-negative';
                
                const marginCell = row.insertCell(4);
                const margin = productData.sales > 0 ? 
                    (productData.profit / productData.sales * 100).toFixed(1) : 0;
                marginCell.textContent = margin + '%';
                
                const marginValue = parseFloat(margin);
                if (marginValue >= 70) {
                    marginCell.style.color = '#00A862';
                    marginCell.style.fontWeight = '700';
                } else if (marginValue >= 60) {
                    marginCell.style.color = '#27ae60';
                    marginCell.style.fontWeight = '600';
                } else if (marginValue <= 30) {
                    marginCell.style.color = '#e74c3c';
                    marginCell.style.fontWeight = '700';
                } else if (marginValue <= 40) {
                    marginCell.style.color = '#e67e22';
                    marginCell.style.fontWeight = '600';
                }
                
                const countCell = row.insertCell(5);
                countCell.textContent = productData.count.toLocaleString();
            });
    }

    updateFbaTable(data) {
        const tbody = document.querySelector('#fbaTable tbody');
        tbody.innerHTML = '';

        const fbaFeeItems = [
            { key: 'shippingFees', label: '納品時の輸送手数料', icon: '🚛' },
            { key: 'storageFees', label: 'FBA保管手数料', icon: '🏠' },
            { key: 'advertisingFees', label: '広告費用', icon: '📢' },
            { key: 'couponFees', label: 'クーポンパフォーマンスに基づく料金', icon: '🎫' },
            { key: 'marketplaceFees', label: 'マーケットプレイス配送サービス（請求）', icon: '📫' },
            { key: 'refundFees', label: '返金', icon: '↩️' },
            { key: 'otherFees', label: 'その他手数料合計', icon: '💼' }
        ];

        const totalFbaFeesForDisplay = Object.entries(data.fbaFeeBreakdown)
            .reduce((sum, [, fee]) => sum + fee, 0);
        
        const totalExpenses = Object.entries(data.fbaFeeBreakdown)
            .filter(([key]) => key !== 'refundFees')
            .reduce((sum, [, fee]) => sum + fee, 0);

        fbaFeeItems.forEach(item => {
            const fee = data.fbaFeeBreakdown[item.key];
            if (fee > 0) {
                const row = tbody.insertRow();
                const itemCell = row.insertCell(0);
                itemCell.innerHTML = `${item.icon} ${item.label}`;
                
                const amountCell = row.insertCell(1);
                amountCell.textContent = this.formatCurrency(fee);
                amountCell.className = item.key === 'refundFees' ? 'profit-positive' : 'profit-negative';
                
                const percentCell = row.insertCell(2);
                const percent = totalFbaFeesForDisplay > 0 ? (fee / totalFbaFeesForDisplay * 100).toFixed(1) : 0;
                percentCell.textContent = percent + '%';
            }
        });

        if (totalExpenses > 0 || data.fbaFeeBreakdown.refundFees === 0) {
            const totalRow = tbody.insertRow();
            totalRow.style.borderTop = '2px solid #ddd';
            totalRow.style.fontWeight = 'bold';
            
            const totalItemCell = totalRow.insertCell(0);
            totalItemCell.innerHTML = '💰 <strong>合計経費（返金除く）</strong>';
            
            const totalAmountCell = totalRow.insertCell(1);
            totalAmountCell.innerHTML = `<strong>${this.formatCurrency(totalExpenses)}</strong>`;
            totalAmountCell.className = 'profit-negative';
            
            const totalPercentCell = totalRow.insertCell(2);
            totalPercentCell.innerHTML = '<strong>100.0%</strong>';
        }

        if (totalExpenses === 0 && data.fbaFeeBreakdown.refundFees === 0) {
            const row = tbody.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 3;
            cell.textContent = '経費データがありません';
            cell.style.textAlign = 'center';
            cell.style.color = '#666';
            cell.style.fontStyle = 'italic';
        }
    }

    updateMultiChannelTable(data) {
        const tbody = document.querySelector('#multiChannelTable tbody');
        tbody.innerHTML = '';

        if (data.multiChannelData && data.multiChannelData.orders && data.multiChannelData.orders.length > 0) {
            data.multiChannelData.orders
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .forEach(order => {
                    const row = tbody.insertRow();
                    row.insertCell(0).textContent = order.date;
                    
                    const orderCell = row.insertCell(1);
                    orderCell.textContent = order.orderNumber || '-';
                    orderCell.style.fontFamily = 'monospace';
                    
                    const productCell = row.insertCell(2);
                    productCell.className = 'product-name-cell';
                    const div = document.createElement('div');
                    div.className = 'name-wrapper';
                    
                    const productName = order.product || '-';
                    const setting = this.dataManager.productSettings[productName] || {};
                    const displayName = setting.fullName || productName;

                    const textDiv = document.createElement('div');
                    textDiv.className = 'name-text';
                    textDiv.textContent = displayName;
                    
                    const hoverDiv = document.createElement('div');
                    hoverDiv.className = 'name-hover';
                    hoverDiv.textContent = displayName;
                    
                    div.appendChild(textDiv);
                    div.appendChild(hoverDiv);
                    div.title = displayName;
                    productCell.appendChild(div);
                    
                    const amountCell = row.insertCell(3);
                    amountCell.textContent = this.formatCurrency(order.amount);
                    amountCell.className = 'profit-negative';
                    
                    const sellerCell = row.insertCell(4);
                    sellerCell.textContent = order.seller;
                    sellerCell.style.fontSize = '12px';
                    sellerCell.style.color = '#666';
                });
        } else {
            const row = tbody.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 5;
            cell.textContent = 'マルチチャネル配送データがありません';
            cell.style.textAlign = 'center';
            cell.style.color = '#666';
            cell.style.fontStyle = 'italic';
            cell.style.padding = '40px';
        }
    }

    updateProductFeeTable(data) {
        const tbody = document.querySelector('#productFeeTable tbody');
        tbody.innerHTML = '';

        Object.entries(data.productFeeData || {})
            .filter(([product, feeData]) => feeData.normalFees.length > 0 || feeData.multiChannelFees.length > 0)
            .sort((a, b) => b[1].normalFees.length - a[1].normalFees.length)
            .forEach(([product, feeData]) => {
                const setting = this.dataManager.productSettings[product] || {};
                const displayName = setting.fullName || product;

                const row = tbody.insertRow();
                
                const productCell = row.insertCell(0);
                productCell.className = 'product-name-cell';
                productCell.style.fontWeight = '500';
                const div = document.createElement('div');
                div.className = 'name-wrapper';
                
                const textDiv = document.createElement('div');
                textDiv.className = 'name-text';
                textDiv.textContent = displayName;
                
                const hoverDiv = document.createElement('div');
                hoverDiv.className = 'name-hover';
                hoverDiv.textContent = displayName;
                
                div.appendChild(textDiv);
                div.appendChild(hoverDiv);
                div.title = displayName;
                productCell.appendChild(div);
                
                const normalStats = this.dataManager.calculateFeeStats(feeData.normalFees);
                row.insertCell(1).textContent = normalStats.count;
                row.insertCell(2).textContent = typeof normalStats.avg === 'number' ? normalStats.avg.toFixed(1) : normalStats.avg;
                row.insertCell(3).textContent = normalStats.max;
                row.insertCell(4).textContent = normalStats.min;
                const normalCvCell = row.insertCell(5);
                normalCvCell.textContent = normalStats.cv;
                if (normalStats.cvValue > 0.3) {
                    normalCvCell.style.color = 'var(--danger-color)';
                    normalCvCell.style.fontWeight = '600';
                }
                
                const multiStats = this.dataManager.calculateFeeStats(feeData.multiChannelFees);
                const multiCountCell = row.insertCell(6);
                multiCountCell.textContent = multiStats.count;
                multiCountCell.style.color = multiStats.count > 0 ? '#666' : '#ccc';
                
                const multiAvgCell = row.insertCell(7);
                multiAvgCell.textContent = typeof multiStats.avg === 'number' ? multiStats.avg.toFixed(1) : multiStats.avg;
                multiAvgCell.style.color = multiStats.count > 0 ? '#666' : '#ccc';
                
                const multiMaxCell = row.insertCell(8);
                multiMaxCell.textContent = multiStats.max;
                multiMaxCell.style.color = multiStats.count > 0 ? '#666' : '#ccc';
                
                const multiMinCell = row.insertCell(9);
                multiMinCell.textContent = multiStats.min;
                multiMinCell.style.color = multiStats.count > 0 ? '#666' : '#ccc';
                
                const multiCvCell = row.insertCell(10);
                multiCvCell.textContent = multiStats.cv;
                multiCvCell.style.color = multiStats.count > 0 ? '#666' : '#ccc';
                if (multiStats.cvValue > 0.3 && multiStats.count > 0) {
                    multiCvCell.style.color = 'var(--danger-color)';
                    multiCvCell.style.fontWeight = '600';
                }
            });
    }

    updateProductNetProfitTable(data) {
        const tbody = document.querySelector('#productNetProfitTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        const excludeList = [
            '納品時の輸送手数料',
            'クーポン参加料金',
            'クーポンパフォーマンスに基づく料金',
            '請求',
            '広告費用',
            'FBA保管手数料：',
            '月額登録料：',
            'FBA在庫の返送手数料',
            'FBA在庫の返金'
        ];

        Object.entries(data.productData)
            .filter(([product]) => !excludeList.includes(product))
            .sort((a, b) => b[1].sales - a[1].sales)
            .forEach(([product, productData]) => {
                const setting = this.dataManager.productSettings[product] || {};
                const costPrice = parseFloat(setting.costPrice);
                const expense = parseFloat(setting.expense);
                const hasSettings = !isNaN(costPrice) && !isNaN(expense);
                const displayName = setting.fullName || product;

                const row = tbody.insertRow();
                
                const nameCell = row.insertCell(0);
                nameCell.className = 'product-name-cell';
                const div = document.createElement('div');
                div.className = 'name-wrapper';
                
                const textDiv = document.createElement('div');
                textDiv.className = 'name-text';
                textDiv.textContent = displayName;
                
                const hoverDiv = document.createElement('div');
                hoverDiv.className = 'name-hover';
                hoverDiv.textContent = displayName;
                
                div.appendChild(textDiv);
                div.appendChild(hoverDiv);
                div.title = displayName;
                nameCell.appendChild(div);

                row.insertCell(1).textContent = setting.parentAsin || '-';
                row.insertCell(2).textContent = this.formatCurrency(productData.sales);
                row.insertCell(3).textContent = this.formatCurrency(productData.fees);

                let totalCost = 0;
                let netProfit = 0;
                let netMargin = 0;
                let costDisplay = '-';
                let profitDisplay = '-';
                let marginDisplay = '-';

                if (hasSettings) {
                    const count = productData.count;
                    totalCost = (costPrice + expense) * count;
                    netProfit = productData.profit - totalCost;
                    netMargin = productData.sales > 0 ? (netProfit / productData.sales * 100) : 0;

                    costDisplay = this.formatCurrency(totalCost);
                    profitDisplay = this.formatCurrency(netProfit);
                    marginDisplay = netMargin.toFixed(1) + '%';
                }

                row.insertCell(4).textContent = costDisplay;

                const profitCell = row.insertCell(5);
                profitCell.textContent = profitDisplay;
                if (hasSettings) {
                    profitCell.className = netProfit >= 0 ? 'profit-positive' : 'profit-negative';
                }

                const unitProfitCell = row.insertCell(6);
                if (hasSettings && productData.count > 0) {
                    const unitProfit = netProfit / productData.count;
                    unitProfitCell.textContent = this.formatCurrency(unitProfit);
                    unitProfitCell.className = unitProfit >= 0 ? 'profit-positive' : 'profit-negative';
                } else {
                    unitProfitCell.textContent = '-';
                }

                const marginCell = row.insertCell(7);
                marginCell.textContent = marginDisplay;
                if (hasSettings) {
                    if (netMargin >= 20) {
                        marginCell.style.color = '#00A862';
                        marginCell.style.fontWeight = '700';
                    } else if (netMargin < 0) {
                        marginCell.style.color = '#e74c3c';
                        marginCell.style.fontWeight = '700';
                    }
                }

                row.insertCell(8).textContent = productData.count.toLocaleString();
            });
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    attachSummaryTooltip(valueElementId, items) {
        const el = document.getElementById(valueElementId);
        if (!el) return;
        const card = el.closest('.card');
        if (!card) return;

        const old = card.querySelector('.summary-tooltip');
        if (old) old.remove();

        const tip = document.createElement('div');
        tip.className = 'summary-tooltip';
        tip.innerHTML = items
            .map(i => `${i.label}: <strong>${this.formatCurrency(i.value || 0)}</strong>`) 
            .join('<br>');
        card.appendChild(tip);

        card.classList.add('has-tooltip');
    }

    attachOrderTooltip(valueElementId, items) {
        const el = document.getElementById(valueElementId);
        if (!el) return;
        const card = el.closest('.card');
        if (!card) return;

        const old = card.querySelector('.summary-tooltip');
        if (old) old.remove();

        const tip = document.createElement('div');
        tip.className = 'summary-tooltip';
        tip.innerHTML = items
            .map(i => `${i.label}: <strong>${(i.value || 0).toLocaleString()}件</strong>`) 
            .join('<br>');
        card.appendChild(tip);

        card.classList.add('has-tooltip');
    }

    generateContinuousDates(dailyData, currentPeriod) {
        const existingDates = Object.keys(dailyData).sort();
        if (existingDates.length === 0) return [];

        let startDate, endDate;

        if (currentPeriod !== 'all' && currentPeriod.includes('年') && currentPeriod.includes('月')) {
            const [year, monthStr] = currentPeriod.split('年');
            const month = parseInt(monthStr.replace('月', ''));
            
            startDate = new Date(parseInt(year), month - 1, 1);
            endDate = new Date(parseInt(year), month, 0);
        } else {
            startDate = new Date(existingDates[0]);
            endDate = new Date(existingDates[existingDates.length - 1]);
        }

        const dates = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.getFullYear() + '/' + 
                           (d.getMonth() + 1) + '/' + 
                           d.getDate();
            dates.push(dateStr);
        }

        return dates;
    }

    sortDailyTableByColumn(columnIndex) {
        const columns = ['date', 'sales', 'fees', 'profit', 'margin', 'orders'];
        const column = columns[columnIndex];
        
        if (this.sortState.column === column) {
            this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortState.column = column;
            this.sortState.direction = 'asc';
        }
        
        localStorage.setItem('amazon_dashboard_sort_state', JSON.stringify(this.sortState));
        this.updateDailyTable(this.dataManager.getCurrentData(this.main.currentPeriod, this.main.currentSubPeriod));
    }

    sortDailyData(dataArray) {
        const { column, direction } = this.sortState;
        
        dataArray.sort((a, b) => {
            let valueA = a[column];
            let valueB = b[column];
            
            if (column === 'date') {
                valueA = new Date(valueA);
                valueB = new Date(valueB);
            }
            
            if (direction === 'asc') {
                return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
            } else {
                return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
            }
        });
    }

    updateSortIndicators() {
        const dailyTableHeaders = document.querySelectorAll('#dailyTable th');
        const columns = ['date', 'sales', 'fees', 'profit', 'margin', 'orders'];
        
        dailyTableHeaders.forEach((header, index) => {
            header.textContent = header.textContent.replace(/\s*[↑↓]$/, '');
            if (columns[index] === this.sortState.column) {
                const indicator = this.sortState.direction === 'asc' ? ' ↑' : ' ↓';
                header.textContent += indicator;
            }
        });
    }

    displayLoadedFiles() {
        const fileList = document.getElementById('fileList');
        const fileListToggle = document.getElementById('fileListToggle');
        
        fileList.innerHTML = '';
        // fileList.classList.add('active'); // 自動で開かないように変更

        const fileCount = this.dataManager.loadedFiles.size;
        
        if (fileCount > 0) {
            // トグルボタンを表示し、件数を更新
            fileListToggle.style.display = 'inline-flex';
            const textSpan = fileListToggle.querySelector('span:first-child');
            
            // 現在開いているかどうかでテキストを変える
            if (fileList.classList.contains('active')) {
                textSpan.textContent = `読み込み済みファイルを隠す (${fileCount})`;
            } else {
                textSpan.textContent = `読み込み済みファイルを表示 (${fileCount})`;
            }
        } else {
            fileListToggle.style.display = 'none';
            fileList.classList.remove('active');
        }

        this.dataManager.loadedFiles.forEach((fileData, fileName) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            const fileSize = (fileData.fileSize / 1024).toFixed(1) + ' KB';
            let periodStr = '';
            if (fileData.data.length > 0) {
                const dates = fileData.data.map(r => r['日付']).filter(d => d).sort();
                if (dates.length > 0) {
                    const start = new Date(dates[0]);
                    const end = new Date(dates[dates.length - 1]);
                    periodStr = `${start.getMonth()+1}/${start.getDate()} - ${end.getMonth()+1}/${end.getDate()}`;
                }
            }
            
            fileItem.innerHTML = `
                <div class="file-item-name">
                    📄 ${fileName}
                </div>
                <div class="file-item-info">
                    <span>${periodStr}</span>
                    <span>${fileSize}</span>
                    <span>${fileData.data.length}件</span>
                    <div class="file-item-buttons">
                        <button onclick="dashboard.removeFile('${fileName}')" style="background: var(--danger-color); color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">削除</button>
                    </div>
                </div>
            `;
            
            fileList.appendChild(fileItem);
        });
    }

    toggleFileList(btn) {
        const list = document.getElementById('fileList');
        list.classList.toggle('active');
        
        const textSpan = btn.querySelector('span:first-child');
        const arrowSpan = btn.querySelector('span:last-child');
        const fileCount = this.dataManager.loadedFiles.size;
        
        if (list.classList.contains('active')) {
            textSpan.textContent = `読み込み済みファイルを隠す (${fileCount})`;
            arrowSpan.textContent = '▲';
        } else {
            textSpan.textContent = `読み込み済みファイルを表示 (${fileCount})`;
            arrowSpan.textContent = '▼';
        }
    }

    resetUI() {
        document.getElementById('totalSales').textContent = '¥0';
        document.getElementById('totalSalesFees').textContent = '¥0';
        document.getElementById('totalExpenses').textContent = '¥0';
        document.getElementById('totalProfit').textContent = '¥0';
        document.getElementById('profitMargin').textContent = '0%';
        const grossProfitEl = document.getElementById('grossProfit');
        if (grossProfitEl) grossProfitEl.textContent = '¥0';
        const grossMarginEl = document.getElementById('grossMargin');
        if (grossMarginEl) grossMarginEl.textContent = '0%';
        document.getElementById('orderCount').textContent = '0';
        const refundCountEl = document.getElementById('refundCount');
        if (refundCountEl) refundCountEl.textContent = '0';
        document.getElementById('totalRefunds').textContent = '¥0';
        const refundRateEl = document.getElementById('refundRate');
        if (refundRateEl) refundRateEl.textContent = '0%';
        document.getElementById('transactionCount').textContent = '0';

        const vineCountEl = document.getElementById('vineCount');
        if (vineCountEl) vineCountEl.textContent = '0';
        const vineTotalAmountEl = document.getElementById('vineTotalAmount');
        if (vineTotalAmountEl) vineTotalAmountEl.textContent = '¥0';

        const multiChannelCountEl = document.getElementById('multiChannelCount');
        if (multiChannelCountEl) multiChannelCountEl.textContent = '0';
        const multiChannelAmountEl = document.getElementById('multiChannelAmount');
        if (multiChannelAmountEl) multiChannelAmountEl.textContent = '¥0';

        document.querySelector('#dailyTable tbody').innerHTML = '';
        document.querySelector('#transactionTable tbody').innerHTML = '';
        document.querySelector('#productTable tbody').innerHTML = '';
        document.querySelector('#fbaTable tbody').innerHTML = '';
        document.querySelector('#multiChannelTable tbody').innerHTML = '';
        document.querySelector('#inventoryForecastTable tbody').innerHTML = '';

        document.getElementById('periodSelector').innerHTML = '';
        const subSelector = document.getElementById('subPeriodSelector');
        if (subSelector) subSelector.style.display = 'none';
    }

    showExpenseInfo(event) {
        event.stopPropagation();
        
        const existingPopup = document.querySelector('.expense-info-popup');
        if (existingPopup) {
            existingPopup.remove();
            return;
        }
        
        const data = this.dataManager.getCurrentData(this.main.currentPeriod, this.main.currentSubPeriod);
        
        const popup = document.createElement('div');
        popup.className = 'expense-info-popup';
        
        popup.innerHTML = `
            <span class="popup-close" onclick="this.parentElement.remove()">×</span>
            <h4>合計経費の内訳</h4>
            <ul>
                <li>売上手数料: ${this.formatCurrency(data.totalSalesFees || 0)}</li>
                <li>納品時の輸送手数料: ${this.formatCurrency(data.fbaFeeBreakdown.shippingFees || 0)}</li>
                <li>FBA保管手数料: ${this.formatCurrency(data.fbaFeeBreakdown.storageFees || 0)}</li>
                <li>広告費用: ${this.formatCurrency(data.fbaFeeBreakdown.advertisingFees || 0)}</li>
                <li>クーポンパフォーマンスに基づく料金: ${this.formatCurrency(data.fbaFeeBreakdown.couponFees || 0)}</li>
                <li>マーケットプレイス配送サービス（請求）: ${this.formatCurrency(data.fbaFeeBreakdown.marketplaceFees || 0)}</li>
                <li>その他手数料: ${this.formatCurrency(data.fbaFeeBreakdown.otherFees || 0)}</li>
            </ul>
        `;
        
        document.body.appendChild(popup);
        
        const rect = event.target.getBoundingClientRect();
        popup.style.left = `${rect.left}px`;
        popup.style.top = `${rect.bottom + 10}px`;
        
        const popupRect = popup.getBoundingClientRect();
        if (popupRect.right > window.innerWidth) {
            popup.style.left = `${window.innerWidth - popupRect.width - 20}px`;
        }
        if (popupRect.bottom > window.innerHeight) {
            popup.style.top = `${rect.top - popupRect.height - 10}px`;
            popup.style.setProperty('--arrow-position', 'bottom');
        }
        
        const closePopup = (e) => {
            if (!popup.contains(e.target)) {
                popup.remove();
                document.removeEventListener('click', closePopup);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', closePopup);
        }, 0);
    }

    toggleUsageInfo(btn) {
        const info = document.getElementById('usageInfo');
        info.classList.toggle('active');
        
        const textSpan = btn.querySelector('span:first-child');
        const arrowSpan = btn.querySelector('span:last-child');
        
        if (info.classList.contains('active')) {
            textSpan.textContent = '使い方を隠す';
            arrowSpan.textContent = '▲';
        } else {
            textSpan.textContent = '使い方を表示';
            arrowSpan.textContent = '▼';
        }
    }

    openProductSettingsModal() {
        const modal = document.getElementById('productSettingsModal');
        document.body.style.overflow = 'hidden';
        
        const tbody = document.querySelector('#productSettingsTable tbody');
        tbody.innerHTML = '';

        let sourceData = this.dataManager.processedData;
        if (!sourceData || !sourceData.productData || Object.keys(sourceData.productData).length === 0) {
            if (this.dataManager.data && this.dataManager.data.length > 0) {
                sourceData = this.dataManager.aggregateData(this.dataManager.data);
            } else {
                sourceData = { productData: {} };
            }
        }

        const excludeList = [
            'FBA保管手数料：',
            'クーポンパフォーマンスに基づく料金',
            'クーポン参加料金',
            '広告費用',
            '月額登録料：',
            '納品時の輸送手数料',
            '請求',
            'FBA在庫の返金',
            'FBA在庫の返送手数料'
        ];

        const products = Object.keys(sourceData.productData || {})
            .filter(product => !excludeList.includes(product))
            .sort();

        if (products.length === 0) {
            const row = tbody.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 4;
            cell.textContent = 'データが読み込まれていません。先にCSVファイルを読み込んでください。';
            cell.style.textAlign = 'center';
            cell.style.padding = '20px';
        } else {
            products.forEach(product => {
                const setting = this.dataManager.productSettings[product] || { parentAsin: '', costPrice: '', expense: '', fullName: '' };
                const row = tbody.insertRow();

                const nameCell = row.insertCell(0);
                nameCell.className = 'product-name-cell';
                const div = document.createElement('div');
                div.className = 'name-wrapper';
                
                const textDiv = document.createElement('div');
                textDiv.className = 'name-text';
                textDiv.textContent = product;
                
                const hoverDiv = document.createElement('div');
                hoverDiv.className = 'name-hover';
                hoverDiv.textContent = product;
                
                div.appendChild(textDiv);
                div.appendChild(hoverDiv);
                div.title = product;
                nameCell.appendChild(div);

                const fullNameCell = row.insertCell(1);
                const fullNameInput = document.createElement('input');
                fullNameInput.type = 'text';
                fullNameInput.value = setting.fullName || '';
                fullNameInput.placeholder = '正式名称';
                fullNameInput.dataset.product = product;
                fullNameInput.dataset.field = 'fullName';
                fullNameCell.appendChild(fullNameInput);

                const asinCell = row.insertCell(2);
                const asinInput = document.createElement('input');
                asinInput.type = 'text';
                asinInput.value = setting.parentAsin || '';
                asinInput.placeholder = 'ASIN';
                asinInput.dataset.product = product;
                asinInput.dataset.field = 'parentAsin';
                asinCell.appendChild(asinInput);

                const costCell = row.insertCell(3);
                const costInput = document.createElement('input');
                costInput.type = 'number';
                costInput.value = setting.costPrice || '';
                costInput.placeholder = '0';
                costInput.min = '0';
                costInput.dataset.product = product;
                costInput.dataset.field = 'costPrice';
                costCell.appendChild(costInput);

                const expenseCell = row.insertCell(4);
                const expenseInput = document.createElement('input');
                expenseInput.type = 'number';
                expenseInput.value = setting.expense || '';
                expenseInput.placeholder = '0';
                expenseInput.min = '0';
                expenseInput.dataset.product = product;
                expenseInput.dataset.field = 'expense';
                expenseCell.appendChild(expenseInput);
            });
        }

        modal.classList.add('active');
    }

    closeProductSettingsModal() {
        document.getElementById('productSettingsModal').classList.remove('active');
        document.body.style.overflow = '';
    }

    switchTab(tab) {
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        document.querySelectorAll('.table-content').forEach(content => {
            content.classList.remove('active');
        });

        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}-tab`).classList.add('active');
        
        localStorage.setItem('amazon_dashboard_active_tab', tab);
    }

    async showDuplicateConfirmation(fileName) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            `;

            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white;
                padding: 30px;
                border-radius: 12px;
                max-width: 500px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            `;

            dialog.innerHTML = `
                <h3 style="margin-bottom: 20px; color: var(--text-primary);">⚠️ ファイル重複の確認</h3>
                <p style="margin-bottom: 20px; color: var(--text-secondary); line-height: 1.5;">
                    ファイル「<strong>${fileName}</strong>」は既に読み込まれています。<br>
                    新しいデータで置き換えますか？
                </p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="confirmReplace" class="btn-primary">置き換える</button>
                    <button id="cancelReplace" style="padding: 0.6rem 1.2rem; border: 2px solid var(--text-secondary); background: white; color: var(--text-secondary); border-radius: 8px; cursor: pointer;">キャンセル</button>
                </div>
            `;

            modal.appendChild(dialog);
            document.body.appendChild(modal);

            document.getElementById('confirmReplace').onclick = () => {
                document.body.removeChild(modal);
                resolve(true);
            };

            document.getElementById('cancelReplace').onclick = () => {
                document.body.removeChild(modal);
                resolve(false);
            };
        });
    }

    updateInventoryForecastTable() {
        const table = document.querySelector('#inventoryForecastTable');
        if (!table) return;
        
        // ヘッダーの再構築（ソート機能のため）
        const thead = table.querySelector('thead');
        if (thead) {
            thead.innerHTML = '';
            const headerRow = thead.insertRow();
            
            const headers = [
                { id: 'product', label: '商品名' },
                { id: '0', label: '1月' }, { id: '1', label: '2月' }, { id: '2', label: '3月' },
                { id: '3', label: '4月' }, { id: '4', label: '5月' }, { id: '5', label: '6月' },
                { id: '6', label: '7月' }, { id: '7', label: '8月' }, { id: '8', label: '9月' },
                { id: '9', label: '10月' }, { id: '10', label: '11月' }, { id: '11', label: '12月' },
                { id: 'total', label: '合計' }
            ];

            headers.forEach(h => {
                const th = document.createElement('th');
                th.textContent = h.label;
                th.style.cursor = 'pointer';
                th.style.userSelect = 'none';
                
                if (this.forecastSortState.column === h.id) {
                    th.textContent += this.forecastSortState.direction === 'asc' ? ' ↑' : ' ↓';
                    th.style.backgroundColor = '#e9ecef';
                }

                th.onclick = () => {
                    if (this.forecastSortState.column === h.id) {
                        this.forecastSortState.direction = this.forecastSortState.direction === 'asc' ? 'desc' : 'asc';
                    } else {
                        this.forecastSortState.column = h.id;
                        this.forecastSortState.direction = 'desc'; // 数値が多い順が見やすいのでデフォルト降順
                    }
                    localStorage.setItem('amazon_dashboard_forecast_sort_state', JSON.stringify(this.forecastSortState));
                    this.updateInventoryForecastTable();
                };
                
                headerRow.appendChild(th);
            });
        }

        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        const forecastData = this.dataManager.generateInventoryForecastData();
        
        // データ配列化とソート
        const sortedProducts = Object.entries(forecastData).map(([product, data]) => {
            const total = data.counts.reduce((acc, val) => acc + val, 0);
            return {
                product,
                counts: data.counts,
                details: data.details,
                season: data.season,
                total,
                maxCount: Math.max(...data.counts)
            };
        }).sort((a, b) => {
            const col = this.forecastSortState.column;
            const dir = this.forecastSortState.direction === 'asc' ? 1 : -1;
            
            if (col === 'product') {
                return a.product.localeCompare(b.product) * dir;
            } else if (col === 'total') {
                return (a.total - b.total) * dir;
            } else {
                // 月ごとのソート (0-11)
                const monthIndex = parseInt(col);
                if (!isNaN(monthIndex)) {
                    return (a.counts[monthIndex] - b.counts[monthIndex]) * dir;
                }
            }
            return 0;
        });

        sortedProducts.forEach(item => {
            const setting = this.dataManager.productSettings[item.product] || {};
            const displayName = setting.fullName || item.product;
            
            const row = tbody.insertRow();
            
            // 商品名
            const nameCell = row.insertCell(0);
            nameCell.className = 'product-name-cell';
            
            // シーズンごとの色分けクラス追加
            if (item.season !== 'all') {
                nameCell.classList.add(`season-${item.season}`);
            }

            const div = document.createElement('div');
            div.className = 'name-wrapper';
            const textDiv = document.createElement('div');
            textDiv.className = 'name-text';
            textDiv.textContent = displayName;
            const hoverDiv = document.createElement('div');
            hoverDiv.className = 'name-hover';
            hoverDiv.textContent = displayName;
            div.appendChild(textDiv);
            div.appendChild(hoverDiv);
            div.title = displayName;
            nameCell.appendChild(div);

            // 1-12月
            item.counts.forEach((count, index) => {
                const cell = row.insertCell();
                cell.textContent = count > 0 ? count.toLocaleString() : '-';
                cell.style.textAlign = 'center';
                cell.style.color = count > 0 ? '#333' : '#ccc';
                
                // ヒートマップ（グラデーション）
                // 商品ごとの最大値を基準にする
                if (count > 0 && item.maxCount > 0) {
                    const ratio = count / item.maxCount;
                    // オレンジ色 (255, 153, 102) をベースに透明度で濃淡
                    // 最小でも少し色をつけるために 0.1 を足す
                    const alpha = (ratio * 0.7) + 0.05;
                    cell.style.backgroundColor = `rgba(255, 153, 102, ${alpha})`;
                }

                // ツールチップ（過去の販売数と仕入推奨レンジ）
                if (item.details && item.details[index]) {
                    const detail = item.details[index];
                    if (detail.avgSales > 0) {
                        const minRange = Math.round(detail.avgSales * 0.5);
                        const maxRange = Math.round(detail.avgSales * 2);
                        
                        cell.style.position = 'relative';
                        cell.classList.add('forecast-cell-tooltip');
                        cell.dataset.tooltip = `過去の販売数(平均): ${detail.avgSales.toFixed(1)}個 | 仕入推奨: ${minRange}〜${maxRange}個`;
                    }
                }
            });

            // 合計
            const totalCell = row.insertCell();
            totalCell.textContent = item.total.toLocaleString();
            totalCell.style.fontWeight = 'bold';
            totalCell.style.textAlign = 'center';
        });
    }
}
