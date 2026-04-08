import React, { useRef } from "react";

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  sale_price: number;
}

interface Ticket58mmProps {
  orgName: string;
  orgLogoUrl?: string;
  clientName?: string;
  items: CartItem[];
  total: number;
}

export default function Ticket58mm({ orgName, orgLogoUrl, clientName, items, total }: Ticket58mmProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (num: number) => num.toFixed(2) + " $";

  const currentDate = new Date();
  const dateStr = currentDate.toLocaleDateString();
  const timeStr = currentDate.toLocaleTimeString();

  // Fonction pour imprimer le ticket à la demande
  const printTicket = () => {
    if (!printRef.current) return;

    const printContents = printRef.current.innerHTML;
    const newWindow = window.open("", "_blank", "width=300,height=600");
    if (!newWindow) return;

    newWindow.document.write(`
      <html>
        <head>
          <title>Ticket</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 11px; padding: 5px; width: 58mm; color: #000; }
            .center { text-align: center; }
            .logo { max-width: 50px; margin: 0 auto 5px; display: block; }
            .divider { border-top: 1px dashed #000; margin: 5px 0; }
            .item { display: flex; justify-content: space-between; margin: 2px 0; }
            .item span { display: inline-block; }
            .qty { width: 15%; }
            .name { width: 55%; text-align: left; padding-left: 2px; }
            .price { width: 30%; text-align: right; }
            .total { font-weight: bold; font-size: 13px; background: #f0f0f0; padding: 3px; margin-top: 5px; }
            .footer { margin-top: 10px; text-align: center; font-size: 9px; }
          </style>
        </head>
        <body>
          ${printContents}
          <script>
            window.onload=function(){window.print(); window.close();}
          </script>
        </body>
      </html>
    `);
    newWindow.document.close();
  };

  return (
    <div>
      {/* Contenu du ticket */}
      <div ref={printRef} className="hidden">
        <div className="center">
          {orgLogoUrl && <img src={orgLogoUrl} alt="Logo" className="logo" />}
          <div style={{ fontWeight: "bold", fontSize: "14px" }}>{orgName}</div>
          <div>{dateStr} {timeStr}</div>
          {clientName && <div>Client: {clientName}</div>}
          <div className="divider" />
        </div>

        {/* Entête colonnes */}
        <div className="item" style={{ fontWeight: "bold", marginBottom: "2px" }}>
          <span className="qty">Qté</span>
          <span className="name">Produit</span>
          <span className="price">Prix</span>
        </div>
        <div className="divider" />

        {/* Liste des produits */}
        {items.map(item => (
          <div key={item.id} className="item">
            <span className="qty">{item.quantity}</span>
            <span className="name">{item.name}</span>
            <span className="price">{formatCurrency(item.quantity * item.sale_price)}</span>
          </div>
        ))}

        {/* Total */}
        <div className="total item">
          <span>Total:</span>
          <span>{formatCurrency(total)}</span>
        </div>

        {/* Footer */}
        <div className="center footer">
          Merci pour votre achat!<br/>
          TVA incluse si applicable<br/>
          Contact: +243 XXX XXX XXX<br/>
          www.monsite.com
        </div>
      </div>

      {/* Bouton ou appel depuis POS */}
      <button onClick={printTicket} className="hidden">Imprimer Ticket</button>
    </div>
  );
}