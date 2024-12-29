let payoffChart = null;

function generateContractInputs() {
    const numContracts = document.getElementById('numContracts').value;
    const contractInputs = document.getElementById('contractInputs');
    contractInputs.innerHTML = '';

    for (let i = 1; i <= numContracts; i++) {
        const contractDiv = document.createElement('div');
        contractDiv.className = 'contract-inputs';
        contractDiv.innerHTML = `
            <h3>Contract ${i}</h3>
            <select name="buyOrSell${i}">
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
            </select>
            <select name="optionType${i}">
                <option value="call">Call</option>
                <option value="put">Put</option>
            </select>
            <input type="number" name="strikePrice${i}" placeholder="Strike Price" required>
            <input type="number" name="premium${i}" placeholder="Premium" required>
        `;
        contractInputs.appendChild(contractDiv);
    }
}
document.addEventListener('DOMContentLoaded', function() {
    const priceInputMethod = document.getElementById('priceInputMethod');
    const tickerInput = document.getElementById('tickerInput');
    const manualPriceInput = document.getElementById('manualPriceInput');

    priceInputMethod.addEventListener('change', function() {
        if (this.value === 'ticker') {
            tickerInput.style.display = 'block';
            manualPriceInput.style.display = 'none';
        } else {
            tickerInput.style.display = 'none';
            manualPriceInput.style.display = 'block';
        }
    });
});

async function calculatePayoff() {
    const useTickerInput = document.getElementById('priceInputMethod').value === 'ticker';
    const stockTicker = useTickerInput ? document.getElementById('stockTicker').value : null;
    const manualStockPrice = useTickerInput ? null : parseFloat(document.getElementById('stockPrice').value);
    const numContracts = parseInt(document.getElementById('numContracts').value);
    let contracts = [];

    for (let i = 1; i <= numContracts; i++) {
        contracts.push({
            buyOrSell: document.querySelector(`select[name="buyOrSell${i}"]`).value,
            optionType: document.querySelector(`select[name="optionType${i}"]`).value,
            strikePrice: parseFloat(document.querySelector(`input[name="strikePrice${i}"]`).value),
            premium: parseFloat(document.querySelector(`input[name="premium${i}"]`).value)
        });
    }

    try {
        const response = await fetch('/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stockTicker, manualStockPrice, contracts, useTickerInput })
        });
        const data = await response.json();

        let resultHTML = `<p>Current Stock Price: $${data.currentPrice.toFixed(2)}</p>`;
        resultHTML += `<p>Average Profit/Loss: $${data.averageProfitLoss.toFixed(2)}</p>`;
        if (useTickerInput) {
            resultHTML += `<p>Expected Profit: $${data.expectedProfit.toFixed(2)}</p>`;
            resultHTML += `<p>Stock Volatility: ${(data.volatility * 100).toFixed(2)}%</p>`;
        }
        document.getElementById('result').innerHTML = resultHTML;
        drawChart(data.priceRange, data.payoff);
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while calculating. Please try again.');
    }
}

function drawChart(priceRange, payoff) {
    const ctx = document.getElementById('payoffChart').getContext('2d');
    if (payoffChart) {
        payoffChart.destroy();
    }

    payoffChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: priceRange,
            datasets: [{
                label: 'Profit',
                data: payoff,
                borderColor: 'blue',
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Stock Price'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Profit/Loss'
                    }
                }
            },
            plugins: {
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line',
                            yMin: 0,
                            yMax: 0,
                            borderColor: 'rgba(0, 0, 0, 0.5)',
                            borderWidth: 2,
                        }
                    }
                }
            }
        }
    });
}



// Toggle Common Option Spreads information
document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggleSpreads');
    const spreadInfo = document.getElementById('spreadInfo');

    toggleButton.addEventListener('click', function() {
        if (spreadInfo.style.display === 'none') {
            spreadInfo.style.display = 'block';
            toggleButton.textContent = 'Hide Common Option Spreads';
        } else {
            spreadInfo.style.display = 'none';
            toggleButton.textContent = 'Common Option Spreads';
        }
    });
});
