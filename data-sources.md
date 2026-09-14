# District Data Sources

## Weather

CropWise will use the [Open-Meteo Forecast API](https://open-meteo.com/en/docs) with the provider’s [Geocoding API](https://open-meteo.com/en/docs/geocoding-api). The geocoding endpoint accepts a location name and supports country filtering; the forecast endpoint accepts latitude and longitude and returns current conditions plus daily forecast values. The evaluated public documentation states that API keys are not needed for the standard endpoint.

## Mandi prices

CropWise will integrate the [CEDA Agmarknet API](https://api.ceda.ashoka.edu.in/documentation/). Its documented production API includes geography and commodity lists, then market and price queries. The price endpoint supports national, state, district, and market levels, enabling a selected CropWise district to determine the displayed mandi context. Authentication and request-schema details must be verified against the live API before release.

The documented district-price request is a JSON `POST` to `/v1/agmarknet/prices` that includes a `commodity_id`, `state_id`, one or more `district_id` values, and an inclusive date range. The documented response includes `min_price`, `max_price`, and `modal_price` records. The provider rejected the current credential as expired during a live geography request, so the CropWise interface must keep its mandi card in an explicit unavailable state until a current key is supplied.

Commodity lookup returns `{ commodities: [{ id, name }] }`, while geography lookup returns `{ geographies: [{ state_id, state_name, districts: [{ district_id, district_name }] }] }`. CropWise can therefore resolve its selected crop, state, and district dynamically rather than relying on hard-coded market IDs.
