// form-templates.js - Standalone Single Source of Truth for Form Layouts & Blueprints

export const SECTION_BLUEPRINTS = {
  "personal": {
    title: "Personal Information",
    html: `
      <div class="form-preview-section" style="margin-bottom: 24px; padding: 20px; border: 1px solid #cfe3ff; border-radius: 6px; background: #fafcfe;">
        <h4 style="color: #071c72; font-size: 15px; font-weight: 750; margin-bottom: 12px;">Personal Information Section</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div><label style="display: block; font-size: 12px; font-weight: 700; color: #0866f5; margin-bottom: 4px;">First Name *</label><input type="text" class="control" disabled placeholder="Student first name" style="background:#fff;"></div>
          <div><label style="display: block; font-size: 12px; font-weight: 700; color: #0866f5; margin-bottom: 4px;">Last Name *</label><input type="text" class="control" disabled placeholder="Student last name" style="background:#fff;"></div>
          <div><label style="display: block; font-size: 12px; font-weight: 700; color: #0866f5; margin-bottom: 4px;">ID / Passport Number *</label><input type="text" class="control" disabled placeholder="ID number" style="background:#fff;"></div>
          <div><label style="display: block; font-size: 12px; font-weight: 700; color: #0866f5; margin-bottom: 4px;">Date of Birth *</label><input type="date" class="control" disabled style="background:#fff;"></div>
        </div>
      </div>
    `
  },
  "contact": {
    title: "Contact Information",
    html: `
      <div class="form-preview-section" style="margin-bottom: 24px; padding: 20px; border: 1px solid #cfe3ff; border-radius: 6px; background: #fafcfe;">
        <h4 style="color: #071c72; font-size: 15px; font-weight: 750; margin-bottom: 12px;">Contact Information Section</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div><label style="display: block; font-size: 12px; font-weight: 700; color: #0866f5; margin-bottom: 4px;">Email Address *</label><input type="email" class="control" disabled placeholder="student@example.com" style="background:#fff;"></div>
          <div><label style="display: block; font-size: 12px; font-weight: 700; color: #0866f5; margin-bottom: 4px;">Mobile Phone *</label><input type="tel" class="control" disabled placeholder="+27 ..." style="background:#fff;"></div>
          <div style="grid-column: span 2;"><label style="display: block; font-size: 12px; font-weight: 700; color: #0866f5; margin-bottom: 4px;">Residential Address *</label><input type="text" class="control" disabled placeholder="Street address, City, Province, Postal Code" style="background:#fff;"></div>
        </div>
      </div>
    `
  },
  "guardian": {
    title: "Parent or Guardian Information",
    html: `
      <div class="form-preview-section" style="margin-bottom: 24px; padding: 20px; border: 1px solid #cfe3ff; border-radius: 6px; background: #fafcfe;">
        <h4 style="color: #071c72; font-size: 15px; font-weight: 750; margin-bottom: 12px;">Parent or Guardian Information Section</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div><label style="display: block; font-size: 12px; font-weight: 700; color: #0866f5; margin-bottom: 4px;">Guardian Full Name *</label><input type="text" class="control" disabled placeholder="Guardian name" style="background:#fff;"></div>
          <div><label style="display: block; font-size: 12px; font-weight: 700; color: #0866f5; margin-bottom: 4px;">Guardian Contact Number *</label><input type="tel" class="control" disabled placeholder="Guardian phone" style="background:#fff;"></div>
        </div>
      </div>
    `
  },
  "education_courses": {
    title: "Educational Background & Course Selection",
    html: `
      <div class="form-preview-section" style="margin-bottom: 24px; padding: 20px; border: 1px solid #cfe3ff; border-radius: 6px; background: #fafcfe;">
        <h4 style="color: #071c72; font-size: 15px; font-weight: 750; margin-bottom: 12px;">Educational Background & Course Selection Section</h4>
        <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
          <div><label style="display: block; font-size: 12px; font-weight: 700; color: #0866f5; margin-bottom: 4px;">Highest School Grade / Qualification *</label><input type="text" class="control" disabled placeholder="e.g. Matric / Grade 12" style="background:#fff;"></div>
          <div><label style="display: block; font-size: 12px; font-weight: 700; color: #0866f5; margin-bottom: 4px;">Selected Course Preferences *</label><div style="padding: 12px; background: #fff; border: 1px solid #b8d9ff; border-radius: 6px; color: #244b88; font-size: 13px;">(Dynamically bound from your selected Master Courses list in Step 3)</div></div>
        </div>
      </div>
    `
  },
  "additional_info": {
    title: "Additional Applicant Information & Declarations",
    html: `
      <div class="form-preview-section" style="margin-bottom: 24px; padding: 20px; border: 1px solid #cfe3ff; border-radius: 6px; background: #fafcfe;">
        <h4 style="color: #071c72; font-size: 15px; font-weight: 750; margin-bottom: 12px;">Additional Applicant Information & Declarations Section</h4>
        <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
          <div><label style="display: block; font-size: 12px; font-weight: 700; color: #0866f5; margin-bottom: 4px;">Do you require financial aid / bursary assistance? *</label><select class="control" disabled style="background:#fff;"><option>Select option</option></select></div>
        </div>
      </div>
    `
  },
  "documents": {
    title: "Supporting Documents",
    html: `
      <div class="form-preview-section" style="margin-bottom: 24px; padding: 20px; border: 1px solid #cfe3ff; border-radius: 6px; background: #fafcfe;">
        <h4 style="color: #071c72; font-size: 15px; font-weight: 750; margin-bottom: 12px;">Supporting Documents Section</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div><label style="display: block; font-size: 12px; font-weight: 700; color: #0866f5; margin-bottom: 4px;">Certified ID Copy *</label><input type="file" class="control" disabled style="background:#fff; padding-top:8px;"></div>
          <div><label style="display: block; font-size: 12px; font-weight: 700; color: #0866f5; margin-bottom: 4px;">Academic Results / Certificates *</label><input type="file" class="control" disabled style="background:#fff; padding-top:8px;"></div>
        </div>
      </div>
    `
  }
};
