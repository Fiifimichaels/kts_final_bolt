/// <reference types="https://deno.land/x/deno@v1.28.0/lib/deno.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// import { Resend } from "npm:resend@2.6.0";
import { Resend } from "https://esm.sh/resend@2.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface BookingReceiptData {
  booking_id: string;
  customer_name: string;
  customer_email: string;
  pickup_point: string;
  destination: string;
  seat_number: number;
  departure_date: string;
  amount: number;
  payment_reference: string;
  booking_date: string;
  class: string;
  phone: string;
  contact_person_name: string;
  contact_person_phone: string;
  referral: string;
  bus_type: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { booking_data }: { booking_data: BookingReceiptData } = await req.json()

    // Create HTML email template with enhanced design
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmation - Khompatek Transport Service</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="40" r="1.5" fill="rgba(255,255,255,0.1)"/><circle cx="40" cy="80" r="1" fill="rgba(255,255,255,0.1)"/></svg>');
        }
        .header-content {
            position: relative;
            z-index: 1;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        .header .subtitle {
            margin: 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .bus-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        .content {
            padding: 40px 30px;
        }
        .success-badge {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            display: inline-block;
            font-weight: bold;
            margin-bottom: 24px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        .booking-details {
            background: linear-gradient(135deg, #f8fafc, #f1f5f9);
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            border: 1px solid #e2e8f0;
        }
        .detail-section {
            margin-bottom: 20px;
        }
        .detail-section:last-child {
            margin-bottom: 0;
        }
        .section-title {
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 12px;
            font-size: 16px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 4px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px solid #f1f5f9;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-weight: 600;
            color: #475569;
        }
        .detail-value {
            color: #1f2937;
            font-weight: 500;
        }
        .amount {
            font-size: 20px;
            font-weight: bold;
            color: #059669;
        }
        .payment-ref {
            font-family: 'Courier New', monospace;
            background: #f1f5f9;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 14px;
        }
        .important-info {
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            border: 1px solid #f59e0b;
            border-radius: 12px;
            padding: 20px;
            margin: 24px 0;
        }
        .important-info h3 {
            margin: 0 0 12px 0;
            color: #92400e;
            font-size: 18px;
        }
        .important-info ul {
            margin: 0;
            padding-left: 20px;
        }
        .important-info li {
            margin-bottom: 6px;
            color: #92400e;
        }
        .qr-section {
            background: #f8fafc;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            margin: 24px 0;
            border: 2px dashed #cbd5e1;
        }
        .footer {
            background: linear-gradient(135deg, #f9fafb, #f3f4f6);
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .contact-info {
            margin: 20px 0;
        }
        .contact-info a {
            color: #2563eb;
            text-decoration: none;
            font-weight: 500;
        }
        .contact-info a:hover {
            text-decoration: underline;
        }
        .social-links {
            margin: 20px 0;
        }
        .social-links a {
            display: inline-block;
            margin: 0 10px;
            padding: 8px 16px;
            background: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
        }
        .approval-badge {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            text-align: center;
            margin: 24px 0;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .content, .header, .footer {
                padding: 20px 15px;
            }
            .detail-row {
                flex-direction: column;
                gap: 4px;
            }
            .header h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <div class="bus-icon">🚌</div>
                <h1>Khompatek Transport Service</h1>
                <p class="subtitle">Your trusted travel partner</p>
            </div>
        </div>
        
        <div class="content">
            <div class="success-badge">✅ Payment Confirmed & Booking Approved</div>
            
            <h2 style="color: #1e293b; margin-bottom: 16px;">Booking Confirmation Receipt</h2>
            <p>Dear <strong>${booking_data.customer_name}</strong>,</p>
            <p>Congratulations! Your payment has been successfully processed and your booking has been <strong>automatically approved</strong>. Thank you for choosing Khompatek Transport Service!</p>
            
            <div class="approval-badge">
                <h3 style="margin: 0; font-size: 18px;">🎉 BOOKING APPROVED</h3>
                <p style="margin: 8px 0 0 0; opacity: 0.9;">Your seat is confirmed and ready for travel</p>
            </div>
            
            <div class="booking-details">
                <div class="detail-section">
                    <div class="section-title">📋 Passenger Information</div>
                    <div class="detail-row">
                        <span class="detail-label">Full Name:</span>
                        <span class="detail-value">${booking_data.customer_name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Class/Level:</span>
                        <span class="detail-value">${booking_data.class}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">${booking_data.customer_email}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Phone:</span>
                        <span class="detail-value">${booking_data.phone}</span>
                    </div>
                </div>

                <div class="detail-section">
                    <div class="section-title">🚌 Journey Details</div>
                    <div class="detail-row">
                        <span class="detail-label">Booking ID:</span>
                        <span class="detail-value payment-ref">${booking_data.booking_id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Pick-up Point:</span>
                        <span class="detail-value">${booking_data.pickup_point}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Destination:</span>
                        <span class="detail-value">${booking_data.destination}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Bus Type:</span>
                        <span class="detail-value">${booking_data.bus_type}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Seat Number:</span>
                        <span class="detail-value"><strong>Seat ${booking_data.seat_number}</strong></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Departure Date:</span>
                        <span class="detail-value">${new Date(booking_data.departure_date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Referral:</span>
                        <span class="detail-value">${booking_data.referral}</span>
                    </div>
                </div>

                <div class="detail-section">
                    <div class="section-title">👥 Emergency Contact</div>
                    <div class="detail-row">
                        <span class="detail-label">Contact Person:</span>
                        <span class="detail-value">${booking_data.contact_person_name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Contact Phone:</span>
                        <span class="detail-value">${booking_data.contact_person_phone}</span>
                    </div>
                </div>

                <div class="detail-section">
                    <div class="section-title">💳 Payment Information</div>
                    <div class="detail-row">
                        <span class="detail-label">Booking Date:</span>
                        <span class="detail-value">${new Date(booking_data.booking_date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Payment Reference:</span>
                        <span class="detail-value payment-ref">${booking_data.payment_reference}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Amount Paid:</span>
                        <span class="detail-value amount">GHS ${booking_data.amount.toFixed(2)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Payment Status:</span>
                        <span class="detail-value" style="color: #059669; font-weight: bold;">✅ COMPLETED</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Booking Status:</span>
                        <span class="detail-value" style="color: #059669; font-weight: bold;">✅ APPROVED</span>
                    </div>
                </div>
            </div>
            
            <div class="qr-section">
                <h4 style="margin: 0 0 8px 0; color: #374151;">📱 Digital Ticket</h4>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                    Show this email or booking ID: <strong>${booking_data.booking_id.slice(0, 8).toUpperCase()}</strong> when boarding
                </p>
            </div>
            
            <div class="important-info">
                <h3>📋 Important Travel Information</h3>
                <ul>
                    <li><strong>Arrive 15 minutes early</strong> at your pick-up point</li>
                    <li><strong>Bring a valid ID</strong> for verification</li>
                    <li><strong>Keep this receipt</strong> for your records</li>
                    <li><strong>Your booking is confirmed and approved</strong> - no further action needed</li>
                    <li><strong>Contact us immediately</strong> if you need to make any changes</li>
                    <li><strong>Be punctual</strong> - the bus will depart on time</li>
                </ul>
            </div>
            
            <div style="background: #e0f2fe; padding: 20px; border-radius: 12px; border-left: 4px solid #0284c7;">
                <h4 style="margin: 0 0 8px 0; color: #0c4a6e;">💡 Travel Tips</h4>
                <ul style="margin: 0; padding-left: 20px; color: #0c4a6e;">
                    <li>Charge your devices before travel</li>
                    <li>Bring snacks and water for the journey</li>
                    <li>Dress comfortably for travel</li>
                    <li>Keep your valuables secure</li>
                </ul>
            </div>
            
            <p style="margin-top: 24px;">We look forward to providing you with a safe, comfortable, and enjoyable journey!</p>
            
            <p style="margin-top: 16px; color: #6b7280; font-style: italic;">
                Best regards,<br>
                <strong>Khompatek Transport Service Team</strong>
            </p>
        </div>
        
        <div class="footer">
            <h3 style="margin: 0 0 16px 0; color: #1f2937;">📞 Contact Information</h3>
            <div class="contact-info">
                <p style="margin: 8px 0;"><strong>Phone/WhatsApp:</strong> <a href="tel:+233243762748">+233 243 762 748</a></p>
                <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:michaelquaicoe60@gmail.com">michaelquaicoe60@gmail.com</a></p>
            </div>
            
            <div class="social-links">
                <a href="https://wa.me/233243762748" target="_blank">💬 WhatsApp</a>
                <a href="tel:+233243762748">📞 Call Us</a>
            </div>
            
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                    © ${new Date().getFullYear()} Khompatek Transport Service (KTS). All rights reserved.
                </p>
                <p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 12px;">
                    Providing reliable and comfortable transportation services across Ghana
                </p>
            </div>
        </div>
    </div>
</body>
</html>
    `

    // Create plain text version for better email client compatibility
    const textContent = `
KHOMPATEK TRANSPORT SERVICE - BOOKING CONFIRMATION

Dear ${booking_data.customer_name},

🎉 CONGRATULATIONS! Your payment has been successfully processed and your booking has been AUTOMATICALLY APPROVED.

BOOKING DETAILS:
- Booking ID: ${booking_data.booking_id.slice(0, 8).toUpperCase()}
- Passenger: ${booking_data.customer_name}
- Class: ${booking_data.class}
- Email: ${booking_data.customer_email}
- Phone: ${booking_data.phone}

JOURNEY INFORMATION:
- From: ${booking_data.pickup_point}
- To: ${booking_data.destination}
- Seat Number: ${booking_data.seat_number}
- Departure Date: ${new Date(booking_data.departure_date).toLocaleDateString()}
- Bus Type: ${booking_data.bus_type}

EMERGENCY CONTACT:
- Name: ${booking_data.contact_person_name}
- Phone: ${booking_data.contact_person_phone}

PAYMENT DETAILS:
- Amount Paid: GHS ${booking_data.amount.toFixed(2)}
- Payment Reference: ${booking_data.payment_reference}
- Payment Status: COMPLETED ✅
- Booking Status: APPROVED ✅

IMPORTANT REMINDERS:
• Arrive at pickup point 15 minutes early
• Bring a valid ID for verification
• Your booking is confirmed and approved
• Contact us for any changes: +233 243 762 748

Thank you for choosing Khompatek Transport Service!

Contact Information:
Phone/WhatsApp: +233 243 762 748
Email: michaelquaicoe60@gmail.com

© ${new Date().getFullYear()} Khompatek Transport Service (KTS)
    `

    // Send email via Resend
    const { data: email, error } = await resend.emails.send({
      from: 'Khompatek Transport <bookings@khompatek.com>',
      to: booking_data.customer_email,
      subject: `Booking Confirmed & Approved - Seat ${booking_data.seat_number} | ${booking_data.pickup_point} → ${booking_data.destination}`,
      html: htmlContent,
      text: textContent,
      reply_to: 'michaelquaicoe60@gmail.com',
    });

    if (error) {
      throw new Error(`Resend API error: ${JSON.stringify(error)}`)
    }

    return new Response(
        JSON.stringify({
            success: true,
            message: "Receipt email sent successfully",
            email_sent: true,
            email_result: email,
            booking_id: booking_data.booking_id,
            recipient: booking_data.customer_email,
            from: "michaelquaicoe60@gmail.com",
        }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error sending receipt email:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send receipt email',
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
