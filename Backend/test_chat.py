import io
import json
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError
from fastapi import HTTPException
from Backend import main


class ChatTests(unittest.TestCase):
    def request(self, language='es', messages=None):
        return main.ConsultaChat(ubicacion='Huancayo', contexto={'idioma_respuesta':language, 'mes_consultado':'noviembre'}, mensajes=messages or [{'role':'user','content':'¿Va a llover?'}])

    def response(self, content='Consulta el pronóstico disponible.', finish='stop'):
        return io.BytesIO(json.dumps({'choices':[{'message':{'content':content},'finish_reason':finish}]}).encode())

    @patch.dict(main.os.environ, {'GROQ_API_KEY':'test-only','GROQ_MODEL':'openai/gpt-oss-20b'})
    @patch.object(main, 'consultar_pronostico', return_value=[{'fecha':'2026-11-15','minima':2,'lluvia_por_hora':[{'hora':'12:00','probabilidad_lluvia':60}]}])
    def test_context_language_and_followup(self, forecast):
        for language, name in [('es','español'),('en','inglés'),('qu','quechua wanka de Junín')]:
            with patch.object(main,'urlopen',return_value=self.response()) as transport:
                result=main.chat(self.request(language))
                self.assertTrue(result['respuesta'])
                payload=json.loads(transport.call_args.args[0].data)
                system=payload['messages'][0]['content']
                self.assertIn(name,system)
                self.assertIn('wttr.in',system)
                self.assertIn('2026-11-15',system)
                self.assertEqual(payload['reasoning_effort'],'low')
                self.assertEqual(payload['messages'][-1]['role'],'user')
        # Long valid assistant answers must not make the next question fail 422.
        self.request(messages=[{'role':'assistant','content':'a'*3500},{'role':'user','content':'¿Y después?'}])

    @patch.dict(main.os.environ, {'GROQ_API_KEY':'test-only'})
    @patch.object(main,'consultar_pronostico',side_effect=URLError('offline'))
    def test_forecast_outage_still_allows_chat(self, forecast):
        with patch.object(main,'urlopen',return_value=self.response()) as transport:
            main.chat(self.request())
            self.assertIn('"pronostico": null', json.loads(transport.call_args.args[0].data)['messages'][0]['content'])

    @patch.dict(main.os.environ, {'GROQ_API_KEY':'test-only'})
    @patch.object(main,'consultar_pronostico',return_value=[])
    def test_empty_and_truncated_answers_rejected(self, forecast):
        for content,finish in [('', 'stop'),('Respuesta parcial','length')]:
            with patch.object(main,'urlopen',return_value=self.response(content,finish)), self.assertRaises(HTTPException) as caught:
                main.chat(self.request())
            self.assertEqual(caught.exception.status_code,503)

    @patch.dict(main.os.environ, {'GROQ_API_KEY':'test-only'})
    @patch.object(main,'consultar_pronostico',return_value=[])
    def test_rate_limit_explained(self, forecast):
        with patch.object(main,'urlopen',side_effect=HTTPError('https://test',429,'limit',{},None)), self.assertRaises(HTTPException) as caught:
            main.chat(self.request())
        self.assertEqual(caught.exception.status_code,503)
        self.assertIn('ocupado',caught.exception.detail)

if __name__=='__main__': unittest.main()
