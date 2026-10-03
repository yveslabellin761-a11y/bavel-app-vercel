export default function handler(_request, response) {
  response.statusCode = 503;
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(
    JSON.stringify({
      error: 'api_unavailable',
      message: "L'API Bavel n'est pas encore déployée. Réessayez lorsque le service backend sera disponible."
    })
  );
}
