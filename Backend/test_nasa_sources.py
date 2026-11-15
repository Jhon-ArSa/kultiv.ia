"""Checks that missing satellite days never become a monthly rainfall total."""
import io
import json
import unittest
from unittest.mock import patch

from Backend.main import consultar_gpm_anual, procesar_respuesta


class NasaSourceTests(unittest.TestCase):
    def test_solar_is_optional_when_daily_weather_is_complete(self):
        series = {name: {"20250101": value} for name, value in {
            "T2M": 12, "T2M_MIN": 3, "PRECTOTCORR": 1, "RH2M": 65
        }.items()}
        fecha, valores = procesar_respuesta({"properties": {"parameter": series}, "header": {"fill_value": -999}})
        self.assertEqual(fecha, "20250101")
        self.assertIsNone(valores["ALLSKY_SFC_SW_DWN"])

    def test_solar_uses_its_own_publication_date(self):
        series = {name: {"20250103": value} for name, value in {
            "T2M": 12, "T2M_MIN": 3, "PRECTOTCORR": 1, "RH2M": 65
        }.items()}
        series["ALLSKY_SFC_SW_DWN"] = {"20250102": 18.4, "20250103": -999}
        _, valores = procesar_respuesta({"properties": {"parameter": series}, "header": {"fill_value": -999}})
        self.assertEqual(valores["ALLSKY_SFC_SW_DWN"], 18.4)
        self.assertEqual(valores["ALLSKY_SFC_SW_DWN_FECHA"], "20250102")

    def test_gpm_requires_every_day_in_month(self):
        series = {f"202501{day:02d}": 2.0 for day in range(1, 32)}
        series["20250201"] = 4.0
        payload = {"properties": {"parameter": {"IMERG_PRECTOT": series}}, "header": {"fill_value": -999}}
        with patch("Backend.main.urlopen", return_value=io.BytesIO(json.dumps(payload).encode())):
            consultar_gpm_anual.cache_clear()
            meses = consultar_gpm_anual(-12.13, -75.16, 2025)
        self.assertEqual(meses[0]["lluvia_total_mm"], 62.0)
        self.assertIsNone(meses[1]["lluvia_total_mm"])
        self.assertEqual(meses[1]["dias_validos"], 1)


if __name__ == "__main__":
    unittest.main()
