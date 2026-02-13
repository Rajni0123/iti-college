import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatCurrency } from './formatters';

export function generateReceiptHTML(fee, siteInfo = {}) {
  const collegeName = siteInfo.collegeName || 'Maner Pvt ITI';
  const code = siteInfo.code || 'PR10001156';
  const phone = siteInfo.phone || '+91-9155401839';
  const email = siteInfo.email || 'manerpvtiti@gmail.com';
  const address = siteInfo.address || 'Mahinawan, Near Vishwakarma Mandir, Maner, Patna - 801108';

  const totalAmount = parseFloat(fee.total_amount || fee.amount) || 0;
  const paidAmount = parseFloat(fee.paid_amount) || 0;
  const dueBalance = totalAmount - paidAmount;

  const paymentDate = fee.payment_date
    ? new Date(fee.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const now = new Date();
  const printTime = now.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // 80mm thermal = ~302px at 96dpi. We use ~300px width.
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', Courier, monospace;
          color: #000;
          background: #fff;
          width: 300px;
          margin: 0 auto;
          padding: 12px 10px;
          font-size: 12px;
          line-height: 1.4;
        }

        .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
        .divider-double { border-bottom: 2px solid #000; margin: 8px 0; }
        .center { text-align: center; }
        .bold { font-weight: 700; }
        .right { text-align: right; }

        /* Header */
        .header { text-align: center; margin-bottom: 4px; }
        .college-name { font-size: 16px; font-weight: 900; letter-spacing: 0.5px; }
        .college-code { font-size: 10px; color: #555; margin-top: 1px; }
        .college-addr { font-size: 9px; color: #444; margin-top: 3px; line-height: 1.3; }
        .receipt-title {
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 2px;
          margin: 6px 0 2px;
          padding: 4px 0;
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
          text-align: center;
        }

        /* Meta Row */
        .meta-row { display: flex; justify-content: space-between; font-size: 11px; margin: 3px 0; }
        .meta-label { color: #555; }
        .meta-value { font-weight: 700; }

        /* Student Info */
        .student-section { margin: 4px 0; }
        .student-name { font-size: 14px; font-weight: 900; }
        .student-detail { font-size: 11px; color: #333; margin-top: 2px; }

        /* Table */
        .fee-table { width: 100%; border-collapse: collapse; margin: 6px 0; }
        .fee-table th {
          font-size: 10px;
          text-transform: uppercase;
          border-bottom: 1px solid #000;
          padding: 4px 0;
          text-align: left;
          color: #444;
        }
        .fee-table th:last-child { text-align: right; }
        .fee-table td { padding: 5px 0; font-size: 12px; }
        .fee-table td:last-child { text-align: right; font-weight: 700; }
        .fee-table .total-row td {
          font-size: 14px;
          font-weight: 900;
          border-top: 1px dashed #000;
          padding-top: 6px;
        }
        .fee-table .due-row td { color: #c00; font-weight: 700; }
        .fee-table .paid-row td { }

        /* Amount in words */
        .amount-words { font-size: 10px; color: #333; font-style: italic; margin-top: 4px; }

        /* Footer */
        .footer { text-align: center; font-size: 9px; color: #555; margin-top: 6px; }
        .footer p { margin: 2px 0; }
        .thankyou { font-size: 12px; font-weight: 700; margin: 8px 0 4px; text-align: center; }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <div class="college-name">${collegeName}</div>
        <div class="college-code">${code}</div>
        <div class="college-addr">${address}</div>
        <div class="college-addr">Ph: ${phone} | ${email}</div>
      </div>

      <div class="receipt-title">FEE RECEIPT</div>

      <!-- Receipt Meta -->
      <div class="meta-row">
        <span class="meta-label">Receipt No:</span>
        <span class="meta-value">${fee.receipt_number || fee.invoice_number || 'N/A'}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Date:</span>
        <span class="meta-value">${paymentDate}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Payment Mode:</span>
        <span class="meta-value">${(fee.payment_method || 'Cash').toUpperCase()}</span>
      </div>

      <div class="divider"></div>

      <!-- Student Info -->
      <div class="student-section">
        <div class="student-name">${fee.student_name || '-'}</div>
        ${fee.father_name ? `<div class="student-detail">S/O: ${fee.father_name}</div>` : ''}
        ${fee.mobile ? `<div class="student-detail">Mobile: ${fee.mobile}</div>` : ''}
        <div class="student-detail">Trade: ${fee.trade || '-'}</div>
        ${fee.academic_year ? `<div class="student-detail">Session: ${fee.academic_year}</div>` : ''}
        ${fee.enrollment_number ? `<div class="student-detail">Enrollment: ${fee.enrollment_number}</div>` : ''}
      </div>

      <div class="divider"></div>

      <!-- Fee Table -->
      <table class="fee-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${fee.fee_type || 'Fee'}</td>
            <td>${formatCurrency(totalAmount)}</td>
          </tr>
          <tr class="paid-row total-row">
            <td>PAID</td>
            <td>${formatCurrency(paidAmount)}</td>
          </tr>
          ${dueBalance > 0 ? `
          <tr class="due-row">
            <td>DUE BALANCE</td>
            <td>${formatCurrency(dueBalance)}</td>
          </tr>
          ` : `
          <tr>
            <td style="color:green; font-weight:700;">FULLY PAID</td>
            <td style="color:green;">&#10003;</td>
          </tr>
          `}
        </tbody>
      </table>

      <div class="divider-double"></div>

      <div class="thankyou">Thank You!</div>

      <div class="footer">
        <p>This is a computer-generated receipt.</p>
        <p>No signature required.</p>
        <p style="margin-top:4px;">Printed: ${printTime}</p>
      </div>
    </body>
    </html>
  `;
}

export async function printReceipt(fee, siteInfo) {
  const html = generateReceiptHTML(fee, siteInfo);
  await Print.printAsync({
    html,
    width: 302,  // 80mm thermal width
  });
}

export async function shareReceiptAsPDF(fee, siteInfo) {
  const html = generateReceiptHTML(fee, siteInfo);
  const { uri } = await Print.printToFileAsync({
    html,
    width: 302,
    height: 520,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Receipt - ${fee.student_name}`,
      UTI: 'com.adobe.pdf',
    });
  }
  return uri;
}
