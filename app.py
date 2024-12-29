from flask import Flask, request, jsonify, render_template
import numpy as np
import yfinance as yf
from scipy.stats import norm

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.json
    use_ticker_input = data['useTickerInput']
    contracts = data['contracts']

    try:
        if use_ticker_input:
            stock_ticker = data['stockTicker']
            stock = yf.Ticker(stock_ticker)
            stock_price = stock.info['currentPrice']
            volatility = calculate_volatility(stock_ticker)
        else:
            stock_price = data['manualStockPrice']
            volatility = None
    except:
        return KeyError

    price_range = np.linspace(stock_price * 0.5, stock_price * 1.5, 100)
    total_payoff = np.zeros_like(price_range)

    for contract in contracts:
        if contract['optionType'] == 'call':
            if contract['buyOrSell'] == 'buy':
                payoff = long_call(contract['strikePrice'], contract['premium'], price_range)
            else:
                payoff = short_call(contract['strikePrice'], contract['premium'], price_range)
        else:  # put option
            if contract['buyOrSell'] == 'buy':
                payoff = long_put(contract['strikePrice'], contract['premium'], price_range)
            else:
                payoff = short_put(contract['strikePrice'], contract['premium'], price_range)
        total_payoff += payoff

    average_profit_loss = np.mean(total_payoff)

    result = {
        'currentPrice': round(stock_price, 2),
        'priceRange': [round(num, 2) for num in price_range.tolist()],
        'payoff': [round(num, 2) for num in total_payoff.tolist()],
        'averageProfitLoss': round(float(average_profit_loss), 2)
    }

    if use_ticker_input:
        expected_profit = calculate_expected_profit(contracts, stock_price, volatility)
        result.update({
            'expectedProfit': round(float(expected_profit), 2),
            'volatility': round(float(volatility), 2)
        })

    return jsonify(result)


def calculate_volatility(ticker):
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period="3mo")
        returns = np.log(hist['Close'] / hist['Close'].shift(1))
        return returns.std() * np.sqrt(252)  # Annualized volatility
    except:
        # tell user the ticker is not valid
        return KeyError


def calculate_expected_profit(contracts, stock_price, volatility):
    total_expected_profit = 0
    for contract in contracts:
        if contract['optionType'] == 'call':
            expected_profit = black_scholes_call(stock_price, contract['strikePrice'], 0.05, volatility, 30 / 365)
        else:
            expected_profit = black_scholes_put(stock_price, contract['strikePrice'], 0.05, volatility, 30 / 365)

        if contract['buyOrSell'] == 'sell':
            expected_profit = -expected_profit

        total_expected_profit += expected_profit - contract['premium']

    return total_expected_profit

# Option payoff functions
def long_call(strike, premium, price_range):
    return np.maximum(price_range - strike, 0) - premium

def short_call(strike, premium, price_range):
    return np.minimum(strike - price_range, 0) + premium

def long_put(strike, premium, price_range):
    return np.maximum(strike - price_range, 0) - premium

def short_put(strike, premium, price_range):
    return np.minimum(price_range - strike, 0) + premium

def black_scholes_call(S, K, r, sigma, T):
    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    return S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)

def black_scholes_put(S, K, r, sigma, T):
    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    return K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)

if __name__ == '__main__':
    app.run(debug=True)




