import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  FaMapMarkerAlt,
  FaWhatsapp,
  FaPhone,
  FaEnvelope,
  FaLocationArrow,
} from "react-icons/fa";
import "../styles/contact.css";

const GOOGLE_MAPS_LINK = "https://www.google.com/maps?q=30.467679,-8.8772051";
const WHATSAPP_LINK = "https://wa.me/212781330622";
const EMAIL = "bizzinecarsmohammed@gmail.com";
const PHONE = "+212781330622";
const MAP_SRC = "https://www.google.com/maps?q=30.467679,-8.8772051&z=15&output=embed";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" },
  }),
};

function InfoBlock({ icon, title, children, delay }) {
  return (
    <motion.div
      className="contact-block"
      variants={fadeUp}
      custom={delay}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <span className="contact-block-icon">{icon}</span>
      <div className="contact-block-body">
        <p className="contact-block-label">{title}</p>
        {children}
      </div>
    </motion.div>
  );
}

export default function ContactSection() {
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: "-60px" });

  return (
    <section className="contact-section" ref={sectionRef} id="contact-section">
      {/* Floating WhatsApp button */}
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noreferrer noopener"
        className="contact-whatsapp-fab"
        aria-label="Chat on WhatsApp"
      >
        <FaWhatsapp size={26} />
        <span className="contact-whatsapp-fab-ping" />
      </a>

      <div className="contact-inner">
        {/* Header */}
        <motion.div
          className="contact-header"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <span className="contact-kicker">Contact / Visit Us</span>
          <h2 className="contact-title">BIZZINE CARS</h2>
          <p className="contact-subtitle">
            Visit our agency in Taroudant or contact us directly by phone,
            WhatsApp, or email.
          </p>
        </motion.div>

        {/* 2-column grid */}
        <div className="contact-grid">
          {/* LEFT — Info */}
          <div className="contact-left">
            <InfoBlock
              icon={<FaMapMarkerAlt />}
              title="Address"
              delay={1}
            >
              <p className="contact-block-text">
                N° 192 Avenue Al Manssour, Taroudant
              </p>
            </InfoBlock>

            <div className="contact-divider" />

            <InfoBlock
              icon={<FaPhone />}
              title="Phone / WhatsApp"
              delay={2}
            >
              <a href={`tel:${PHONE}`} className="contact-block-link">
                {PHONE}
              </a>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noreferrer noopener"
                className="contact-block-sublink"
              >
                Message on WhatsApp
              </a>
            </InfoBlock>

            <div className="contact-divider" />

            <InfoBlock
              icon={<FaEnvelope />}
              title="Email"
              delay={3}
            >
              <a
                href={`mailto:${EMAIL}`}
                className="contact-block-link"
              >
                {EMAIL}
              </a>
            </InfoBlock>

            <div className="contact-divider" />

            <InfoBlock
              icon={<FaLocationArrow />}
              title="Location"
              delay={4}
            >
              <a
                href={GOOGLE_MAPS_LINK}
                target="_blank"
                rel="noreferrer noopener"
                className="contact-maps-button"
              >
                Open in Google Maps
              </a>
            </InfoBlock>
          </div>

          {/* RIGHT — Map */}
          <motion.div
            className="contact-map-wrap"
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            <iframe
              src={MAP_SRC}
              title="BIZZINE CARS location"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="contact-map-iframe"
            />
            <div className="contact-map-badge">
              <FaMapMarkerAlt size={14} />
              <span>BIZZINE CARS - Taroudant</span>
            </div>
            <a
              href={GOOGLE_MAPS_LINK}
              target="_blank"
              rel="noreferrer noopener"
              className="contact-map-cta"
            >
              Open in Google Maps
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
