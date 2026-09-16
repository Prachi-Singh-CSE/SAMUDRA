import Sidebar from "../components/Sidebar";
import "./Profile.css";

function Profile() {
  return (
    <>
      <Sidebar />

      <main className="profile-page">
        <div className="profile-container">

          <header className="profile-header">
            <div>
              <p className="profile-eyebrow">ACCOUNT · FISHERMAN PROFILE</p>
              <h1>My Profile</h1>
              <p className="profile-subtitle">
                Your registered vessel, fishing details and emergency
                information.
              </p>
            </div>

            <button className="edit-profile-btn">
              ✎ Edit Profile
            </button>
          </header>

          <div className="profile-grid">

            {/* LEFT COLUMN */}
            <section className="profile-main-card">

              <div className="profile-identity">
                <div className="profile-avatar">
                  SK
                </div>

                <div>
                  <h2>Suresh Kolekar</h2>
                  <p>Registered Fisherman</p>

                  <span className="verified-badge">
                    ✓ VERIFIED PROFILE
                  </span>
                </div>
              </div>

              <div className="profile-divider" />

              <div className="section-heading">
                <span>PERSONAL INFORMATION</span>
              </div>

              <div className="details-grid">
                <div className="detail-item">
                  <span>FULL NAME</span>
                  <strong>Suresh Kolekar</strong>
                </div>

                <div className="detail-item">
                  <span>FISHERMAN ID</span>
                  <strong>FISH-MH-28491</strong>
                </div>

                <div className="detail-item">
                  <span>HOME PORT</span>
                  <strong>Vasai</strong>
                </div>

                <div className="detail-item">
                  <span>STATE</span>
                  <strong>Maharashtra</strong>
                </div>

                <div className="detail-item">
                  <span>CATEGORY</span>
                  <strong>General</strong>
                </div>

                <div className="detail-item">
                  <span>FISHING TYPE</span>
                  <strong>Motorised Trawler</strong>
                </div>
              </div>

              <div className="section-heading vessel-heading">
                <span>VESSEL INFORMATION</span>
              </div>

              <div className="vessel-card">
                <div className="vessel-icon">⚓</div>

                <div className="vessel-info">
                  <h3>Sagar Rani</h3>
                  <p>Registered fishing vessel</p>
                </div>

                <span className="active-status">
                  ● ACTIVE
                </span>
              </div>

              <div className="details-grid vessel-details">
                <div className="detail-item">
                  <span>VESSEL REGISTRATION</span>
                  <strong>IND-KL-2291</strong>
                </div>

                <div className="detail-item">
                  <span>CREW SIZE</span>
                  <strong>5</strong>
                </div>

                <div className="detail-item">
                  <span>VESSEL TYPE</span>
                  <strong>Motorised Trawler</strong>
                </div>

                <div className="detail-item">
                  <span>HOME PORT</span>
                  <strong>Vasai</strong>
                </div>
              </div>

            </section>

            {/* RIGHT COLUMN */}
            <aside className="profile-side">

              <section className="side-card">
                <div className="side-card-header">
                  <div className="side-icon">◉</div>
                  <div>
                    <h3>Profile Status</h3>
                    <p>Verification & account status</p>
                  </div>
                </div>

                <div className="status-row">
                  <span>Identity</span>
                  <strong className="status-verified">
                    ✓ Verified
                  </strong>
                </div>

                <div className="status-row">
                  <span>Vessel</span>
                  <strong className="status-verified">
                    ✓ Registered
                  </strong>
                </div>

                <div className="status-row">
                  <span>Location</span>
                  <strong className="status-verified">
                    ✓ Verified
                  </strong>
                </div>
              </section>

              <section className="side-card">
                <div className="side-card-header">
                  <div className="side-icon">♧</div>
                  <div>
                    <h3>Emergency Contact</h3>
                    <p>Used during SOS situations</p>
                  </div>
                </div>

                <div className="emergency-contact">
                  <strong>Ramesh Kolekar</strong>
                  <span>Family Contact</span>
                  <b>+91 XXXXX XXXXX</b>
                </div>

                <button className="secondary-btn">
                  Update Contact
                </button>
              </section>

              <section className="side-card preferences-card">
                <div className="side-card-header">
                  <div className="side-icon">⚙</div>
                  <div>
                    <h3>Preferences</h3>
                    <p>Customize your experience</p>
                  </div>
                </div>

                <div className="preference-row">
                  <div>
                    <strong>Alert Notifications</strong>
                    <span>Hazard & weather alerts</span>
                  </div>

                  <div className="toggle active">
                    <div />
                  </div>
                </div>

                <div className="preference-row">
                  <div>
                    <strong>Safety Updates</strong>
                    <span>Emergency information</span>
                  </div>

                  <div className="toggle active">
                    <div />
                  </div>
                </div>
              </section>

            </aside>

          </div>

          <div className="profile-footer">
            <span>LAST PROFILE UPDATE</span>
            <strong>06 September 2026</strong>
            <span className="footer-dot">•</span>
            <span>DATA USED FOR PERSONALIZED MARINE INTELLIGENCE</span>
          </div>

        </div>
      </main>
    </>
  );
}

export default Profile;