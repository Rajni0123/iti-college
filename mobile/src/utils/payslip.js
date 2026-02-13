import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatCurrency } from './formatters';

export function generatePayslipHTML(salary, staffInfo = {}, siteInfo = {}) {
  const collegeName = siteInfo.collegeName || 'Maner Pvt ITI';
  const code = siteInfo.code || 'PR10001156';
  const phone = siteInfo.phone || '+91-9155401839';
  const email = siteInfo.email || 'manerpvtiti@gmail.com';
  const address = siteInfo.address || 'Mahinawan, Near Vishwakarma Mandir, Maner, Patna - 801108';

  const staffName = salary.staff_name || staffInfo.name || '-';
  const staffEmail = salary.staff_email || staffInfo.email || '';
  const staffPhone = salary.staff_phone || staffInfo.phone || '';
  const staffRole = salary.staff_role || staffInfo.role || 'Staff';
  const staffId = salary.staff_id || staffInfo.id || '';

  const basicSalary = parseFloat(salary.basic_salary) || 0;
  const hra = parseFloat(salary.hra) || 0;
  const da = parseFloat(salary.da) || 0;
  const ta = parseFloat(salary.ta) || 0;
  const bonus = parseFloat(salary.bonus) || 0;
  const otherAllowances = parseFloat(salary.other_allowances) || 0;
  const grossSalary = basicSalary + hra + da + ta + bonus + otherAllowances;

  const pf = parseFloat(salary.pf_deduction) || 0;
  const tax = parseFloat(salary.tax_deduction) || 0;
  const otherDeductions = parseFloat(salary.other_deductions) || 0;
  const totalDeductions = pf + tax + otherDeductions;

  const netSalary = parseFloat(salary.net_salary) || (grossSalary - totalDeductions);

  const paymentDate = salary.payment_date
    ? new Date(salary.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const monthYear = salary.month && salary.year
    ? `${getMonthName(salary.month)} ${salary.year}`
    : salary.pay_period || paymentDate;

  const now = new Date();
  const printTime = now.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          color: #1e293b;
          background: #fff;
          max-width: 700px;
          margin: 0 auto;
          padding: 0;
          font-size: 13px;
          line-height: 1.5;
        }

        .payslip-container {
          border: 2px solid #1e40af;
          border-radius: 8px;
          overflow: hidden;
        }

        /* Header */
        .header {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: #fff;
          padding: 20px 24px;
          text-align: center;
        }
        .college-name {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 1px;
          margin-bottom: 2px;
        }
        .college-code {
          font-size: 11px;
          opacity: 0.85;
        }
        .college-addr {
          font-size: 11px;
          opacity: 0.8;
          margin-top: 4px;
          line-height: 1.4;
        }
        .payslip-title {
          display: inline-block;
          background: rgba(255,255,255,0.2);
          padding: 6px 24px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 2px;
          margin-top: 12px;
        }

        /* Content */
        .content {
          padding: 20px 24px;
        }

        /* Employee Info */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 24px;
          margin-bottom: 20px;
          padding: 16px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .info-item {
          display: flex;
          gap: 6px;
        }
        .info-label {
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
          min-width: 80px;
        }
        .info-value {
          font-size: 12px;
          font-weight: 600;
          color: #1e293b;
        }

        /* Pay Period */
        .pay-period {
          text-align: center;
          font-size: 15px;
          font-weight: 700;
          color: #1e40af;
          margin-bottom: 16px;
          padding: 8px;
          background: #eff6ff;
          border-radius: 8px;
          border: 1px solid #bfdbfe;
        }

        /* Salary Table */
        .salary-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        .salary-box {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        .salary-box-title {
          font-size: 12px;
          font-weight: 700;
          padding: 8px 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .earnings-title {
          background: #f0fdf4;
          color: #166534;
          border-bottom: 1px solid #bbf7d0;
        }
        .deductions-title {
          background: #fef2f2;
          color: #991b1b;
          border-bottom: 1px solid #fecaca;
        }
        .salary-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 12px;
          font-size: 12px;
          border-bottom: 1px solid #f1f5f9;
        }
        .salary-row:last-child {
          border-bottom: none;
        }
        .salary-row-label {
          color: #475569;
        }
        .salary-row-value {
          font-weight: 600;
          color: #1e293b;
        }
        .salary-total {
          display: flex;
          justify-content: space-between;
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 700;
          border-top: 2px solid #e2e8f0;
        }
        .earnings-total { color: #166534; background: #f0fdf4; }
        .deductions-total { color: #991b1b; background: #fef2f2; }

        /* Net Pay */
        .net-pay {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: #fff;
          border-radius: 8px;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .net-pay-label {
          font-size: 14px;
          font-weight: 600;
          opacity: 0.9;
        }
        .net-pay-value {
          font-size: 24px;
          font-weight: 800;
        }

        /* Payment Info */
        .payment-info {
          display: flex;
          justify-content: space-between;
          padding: 12px 16px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          margin-bottom: 16px;
          font-size: 12px;
        }
        .payment-info-item {
          text-align: center;
        }
        .payment-info-label {
          color: #64748b;
          font-size: 10px;
          font-weight: 500;
        }
        .payment-info-value {
          font-weight: 700;
          color: #1e293b;
          margin-top: 2px;
        }

        /* Signatures */
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 30px;
          padding-top: 16px;
        }
        .signature-box {
          text-align: center;
          width: 40%;
        }
        .signature-line {
          border-top: 1px solid #94a3b8;
          padding-top: 6px;
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
        }

        /* Footer */
        .footer {
          text-align: center;
          font-size: 10px;
          color: #94a3b8;
          margin-top: 20px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
        }
        .footer p { margin: 2px 0; }
        .confidential {
          display: inline-block;
          background: #fef3c7;
          color: #92400e;
          font-size: 9px;
          font-weight: 600;
          padding: 2px 10px;
          border-radius: 4px;
          margin-bottom: 6px;
        }
      </style>
    </head>
    <body>
      <div class="payslip-container">
        <!-- Header -->
        <div class="header">
          <div class="college-name">${collegeName}</div>
          <div class="college-code">${code}</div>
          <div class="college-addr">${address}</div>
          <div class="college-addr">Ph: ${phone} | ${email}</div>
          <div class="payslip-title">SALARY PAY SLIP</div>
        </div>

        <div class="content">
          <!-- Pay Period -->
          <div class="pay-period">Pay Period: ${monthYear}</div>

          <!-- Employee Info -->
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Employee:</span>
              <span class="info-value">${staffName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Employee ID:</span>
              <span class="info-value">${staffId || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Designation:</span>
              <span class="info-value">${(staffRole || '').charAt(0).toUpperCase() + (staffRole || '').slice(1)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Email:</span>
              <span class="info-value">${staffEmail || 'N/A'}</span>
            </div>
            ${staffPhone ? `
            <div class="info-item">
              <span class="info-label">Phone:</span>
              <span class="info-value">${staffPhone}</span>
            </div>
            ` : ''}
            <div class="info-item">
              <span class="info-label">Pay Date:</span>
              <span class="info-value">${paymentDate}</span>
            </div>
          </div>

          <!-- Earnings & Deductions -->
          <div class="salary-section">
            <!-- Earnings -->
            <div class="salary-box">
              <div class="salary-box-title earnings-title">Earnings</div>
              <div class="salary-row">
                <span class="salary-row-label">Basic Salary</span>
                <span class="salary-row-value">${formatCurrency(basicSalary)}</span>
              </div>
              ${hra > 0 ? `
              <div class="salary-row">
                <span class="salary-row-label">HRA</span>
                <span class="salary-row-value">${formatCurrency(hra)}</span>
              </div>` : ''}
              ${da > 0 ? `
              <div class="salary-row">
                <span class="salary-row-label">DA</span>
                <span class="salary-row-value">${formatCurrency(da)}</span>
              </div>` : ''}
              ${ta > 0 ? `
              <div class="salary-row">
                <span class="salary-row-label">TA</span>
                <span class="salary-row-value">${formatCurrency(ta)}</span>
              </div>` : ''}
              ${bonus > 0 ? `
              <div class="salary-row">
                <span class="salary-row-label">Bonus</span>
                <span class="salary-row-value">${formatCurrency(bonus)}</span>
              </div>` : ''}
              ${otherAllowances > 0 ? `
              <div class="salary-row">
                <span class="salary-row-label">Other Allowances</span>
                <span class="salary-row-value">${formatCurrency(otherAllowances)}</span>
              </div>` : ''}
              <div class="salary-total earnings-total">
                <span>Gross Earnings</span>
                <span>${formatCurrency(grossSalary)}</span>
              </div>
            </div>

            <!-- Deductions -->
            <div class="salary-box">
              <div class="salary-box-title deductions-title">Deductions</div>
              ${pf > 0 ? `
              <div class="salary-row">
                <span class="salary-row-label">Provident Fund</span>
                <span class="salary-row-value">${formatCurrency(pf)}</span>
              </div>` : ''}
              ${tax > 0 ? `
              <div class="salary-row">
                <span class="salary-row-label">Tax (TDS)</span>
                <span class="salary-row-value">${formatCurrency(tax)}</span>
              </div>` : ''}
              ${otherDeductions > 0 ? `
              <div class="salary-row">
                <span class="salary-row-label">Other Deductions</span>
                <span class="salary-row-value">${formatCurrency(otherDeductions)}</span>
              </div>` : ''}
              ${totalDeductions === 0 ? `
              <div class="salary-row">
                <span class="salary-row-label" style="color:#94a3b8;">No deductions</span>
                <span class="salary-row-value">-</span>
              </div>` : ''}
              <div class="salary-total deductions-total">
                <span>Total Deductions</span>
                <span>${formatCurrency(totalDeductions)}</span>
              </div>
            </div>
          </div>

          <!-- Net Pay -->
          <div class="net-pay">
            <span class="net-pay-label">NET PAY</span>
            <span class="net-pay-value">${formatCurrency(netSalary)}</span>
          </div>

          <!-- Payment Info -->
          <div class="payment-info">
            <div class="payment-info-item">
              <div class="payment-info-label">Payment Method</div>
              <div class="payment-info-value">${(salary.payment_method || 'Cash').toUpperCase()}</div>
            </div>
            <div class="payment-info-item">
              <div class="payment-info-label">Payment Date</div>
              <div class="payment-info-value">${paymentDate}</div>
            </div>
            <div class="payment-info-item">
              <div class="payment-info-label">Slip No</div>
              <div class="payment-info-value">${salary.slip_number || salary.id || 'N/A'}</div>
            </div>
          </div>

          ${salary.notes ? `
          <div style="padding:8px 12px; background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0; margin-bottom:16px; font-size:12px;">
            <strong style="color:#64748b;">Note:</strong> ${salary.notes}
          </div>
          ` : ''}

          <!-- Signatures -->
          <div class="signatures">
            <div class="signature-box">
              <div class="signature-line">Employee Signature</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Authorized Signature</div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <span class="confidential">CONFIDENTIAL</span>
            <p>This is a computer-generated pay slip. No signature required for digital copy.</p>
            <p>Generated: ${printTime}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getMonthName(month) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return months[(parseInt(month) - 1)] || '';
}

export async function printPayslip(salary, staffInfo, siteInfo) {
  const html = generatePayslipHTML(salary, staffInfo, siteInfo);
  await Print.printAsync({ html });
}

export async function sharePayslipAsPDF(salary, staffInfo, siteInfo) {
  const html = generatePayslipHTML(salary, staffInfo, siteInfo);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    const staffName = salary.staff_name || staffInfo?.name || 'Staff';
    const period = salary.month && salary.year
      ? `${getMonthName(salary.month)}-${salary.year}`
      : 'Payslip';
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Payslip - ${staffName} - ${period}`,
      UTI: 'com.adobe.pdf',
    });
  }
  return uri;
}
