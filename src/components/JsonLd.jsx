import React from 'react';

/**
 * Renderizza uno schema JSON-LD come <script> nel markup React.
 *
 * Renderizzato durante il render (non in useEffect), così react-snap e
 * gli altri prerenderer lo catturano nell'HTML statico. Google e i crawler
 * AI leggono i blocchi JSON-LD ovunque siano (head o body).
 *
 * Uso:
 *   <JsonLd id="my-schema" schema={{ '@context': '...', '@type': '...' }} />
 */
export function JsonLd({ id, schema }) {
    if (!schema) return null;
    return (
        <script
            type="application/ld+json"
            id={id}
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}

export default JsonLd;
