import urllib.parse

origin = "NYC"
destination = "LAX"
month = "2024-07"
currency = "USD"
tok = "your_token_here"

q = urllib.parse.urlencode({
        "origin": origin, "destination": destination,
        "depart_date": month, "currency": currency, "token": tok,
    })

print(q)