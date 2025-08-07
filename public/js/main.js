// ===== DOM Elements =====
const navbar = document.querySelector('.navbar');
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const closeLightboxBtn = document.querySelector('.lightbox .close');
const galleryImages = document.querySelectorAll('.gallery-item img');
const filterButtons = document.querySelectorAll('.gallery-filters button');
const bookingForm = document.getElementById('booking-form');
const contactForm = document.getElementById('contact-form');
const scrollIndicator = document.querySelector('.scroll-indicator span');
const body = document.body;

// ===== Lightbox Functionality =====
let currentImageIndex = 0;
const galleryImageSources = Array.from(galleryImages).map(img => img.src);

function openLightbox(src) {
    currentImageIndex = galleryImageSources.indexOf(src);
    lightboxImg.src = src;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
}

function navigateLightbox(direction) {
    currentImageIndex += direction;
    
    // Handle wrap-around
    if (currentImageIndex < 0) {
        currentImageIndex = galleryImageSources.length - 1;
    } else if (currentImageIndex >= galleryImageSources.length) {
        currentImageIndex = 0;
    }
    
    lightboxImg.src = galleryImageSources[currentImageIndex];
}

// Lightbox event listeners
closeLightboxBtn.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
        closeLightbox();
    }
});

document.querySelector('.lightbox .prev').addEventListener('click', () => navigateLightbox(-1));
document.querySelector('.lightbox .next').addEventListener('click', () => navigateLightbox(1));

// Keyboard navigation for lightbox
document.addEventListener('keydown', (e) => {
    if (lightbox.classList.contains('active')) {
        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowLeft') {
            navigateLightbox(-1);
        } else if (e.key === 'ArrowRight') {
            navigateLightbox(1);
        }
    }
});

// ===== Gallery Filter =====
function filterGallery(category) {
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    filterButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    galleryItems.forEach(item => {
        if (category === 'all' || item.dataset.category === category) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Add intersection observer for more precise lazy loading
const lazyImages = document.querySelectorAll('.gallery-item img[loading="lazy"]');

const imageObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src || img.src;
      img.removeAttribute('data-src');
      observer.unobserve(img);
    }
  });
}, {
  rootMargin: '200px' // Load images 200px before they enter viewport
});

lazyImages.forEach(img => {
  if (!img.complete) {
    img.dataset.src = img.src;
    img.src = '';
    imageObserver.observe(img);
  }
});

// Initialize gallery filter buttons
filterButtons.forEach(button => {
    button.addEventListener('click', function() {
        filterGallery(this.dataset.filter || this.textContent.toLowerCase());
    });
});

// ===== Date/Time Pickers =====
document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.querySelector('.flatpickr-date');
    if (dateInput) {
        flatpickr(dateInput, {
            dateFormat: 'Y-m-d',
            minDate: 'today',
            allowInput: false,
            clickOpens: true,
            disable: [
                function(date) {
                    return (date.getDay() === 0 || date.getDay() === 6);
                }
            ],
        });
    }
});


dateInput.addEventListener('click', () => {
    dateInput._flatpickr.open();
});



// Add validation before submission
function validateBookingForm() {
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    
    if (new Date(`2000-01-01 ${endTime}`) <= new Date(`2000-01-01 ${startTime}`)) {
        showFormError('End time must be after start time');
        return false;
    }
    return true;
}

function showFormError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'form-error-message';
    errorElement.textContent = message;
    
    const form = document.getElementById('booking-form');
    form.prepend(errorElement);
    
    setTimeout(() => {
        errorElement.classList.add('fade-out');
        setTimeout(() => errorElement.remove(), 500);
    }, 5000);
}

// ===== Form Submissions =====
if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formMessage = document.getElementById('form-message');
        const submitBtn = bookingForm.querySelector('button[type="submit"]');
        
        // Disable button during submission
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        const bookingData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            date: document.getElementById('date').value,
            startTime: document.getElementById('start-time').value,
            endTime: document.getElementById('end-time').value,
            eventType: document.getElementById('event-type').value,
            package: document.getElementById('package').value,
            location: document.getElementById('location').value,
            details: document.getElementById('details').value,
            status: 'pending',
            timestamp: new Date().toISOString()
        };

        try {
            // Simulate API call (replace with actual fetch in production)
            const response = await mockApiCall('/api/bookings', bookingData);
            
            if (response.ok) {
                formMessage.textContent = 'Booking submitted successfully! We will contact you shortly to confirm.';
                formMessage.style.color = '#4CAF50';
                bookingForm.reset();
                
                // Show confirmation animation
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Success!';
                setTimeout(() => {
                    submitBtn.innerHTML = 'Submit Booking Request';
                    submitBtn.disabled = false;
                }, 2000);
            } else {
                throw new Error('Server error');
            }
        } catch (error) {
            formMessage.textContent = 'Error submitting booking. Please try again or contact us directly.';
            formMessage.style.color = '#f44336';
            submitBtn.innerHTML = 'Try Again';
            submitBtn.disabled = false;
            console.error('Booking error:', error);
        }
    });
}

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formMessage = document.getElementById('contact-message');
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        
        const contactData = {
            name: document.getElementById('contact-name').value,
            email: document.getElementById('contact-email').value,
            subject: document.getElementById('contact-subject').value,
            phone: document.getElementById('contact-phone').value,
            message: document.getElementById('contact-message').value,
            timestamp: new Date().toISOString()
        };

        try {
            // Simulate API call (replace with actual fetch in production)
            const response = await mockApiCall('/api/contact', contactData);
            
            if (response.ok) {
                formMessage.textContent = 'Message sent successfully! We will respond within 24 hours.';
                formMessage.style.color = '#4CAF50';
                contactForm.reset();
                
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Sent!';
                setTimeout(() => {
                    submitBtn.innerHTML = 'Send Message';
                    submitBtn.disabled = false;
                }, 2000);
            } else {
                throw new Error('Server error');
            }
        } catch (error) {
            formMessage.textContent = 'Error sending message. Please try again or call us directly.';
            formMessage.style.color = '#f44336';
            submitBtn.innerHTML = 'Try Again';
            submitBtn.disabled = false;
            console.error('Contact error:', error);
        }
    });
}

// Add to main.js
document.querySelectorAll('#package option').forEach(option => {
    option.addEventListener('click', function() {
      const select = document.getElementById('package');
      const highlight = document.createElement('div');
      highlight.className = 'package-highlight';
      
      // Remove existing highlight
      const existingHighlight = document.querySelector('.package-highlight');
      if (existingHighlight) existingHighlight.remove();
      
      // Position and animate new highlight
      select.parentNode.appendChild(highlight);
      highlight.style.width = `${select.offsetWidth}px`;
      highlight.style.height = `${select.offsetHeight}px`;
      highlight.style.transform = `translateY(${select.offsetTop}px)`;
    });
});

// Mock API function for demonstration
function mockApiCall(url, data) {
    console.log('Mock API call to:', url, 'with data:', data);
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
        }, 1500);
    });
}

// ===== Navigation =====
function initMobileMenu() {
    console.log("hamburger:", hamburger); // ✅ Add this
    console.log("navLinks:", navLinks);   // ✅ Add this

    if (!hamburger || !navLinks) {
        console.error("Hamburger or navLinks not found!");
        return;
    }

    function toggleMenu() {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
        body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
        hamburger.setAttribute('aria-expanded', hamburger.classList.contains('active'));
    }

    hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768 && navLinks.classList.contains('active')) {
                // Close menu only if it is open
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
                body.style.overflow = '';
                hamburger.setAttribute('aria-expanded', 'false');
            }
        });
    });
    

    document.addEventListener('click', (e) => {
        if (navLinks.classList.contains('active') && 
            !e.target.closest('.navbar')) {
            toggleMenu();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && navLinks.classList.contains('active')) {
            toggleMenu();
        }
    });
}

// Sticky navbar on scroll
window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    // Scroll indicator animation
    if (scrollIndicator) {
        const scrollPercentage = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
        scrollIndicator.style.width = `${scrollPercentage}%`;
    }
});

// ===== Smooth Scrolling =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});


// ===== Scroll Reveal Animation =====
function animateOnScroll() {
    const elements = document.querySelectorAll('.service-card, .team-card, .pricing-card, .testimonial-card');
    
    elements.forEach(element => {
        const elementPosition = element.getBoundingClientRect().top;
        const screenPosition = window.innerHeight / 1.2;
        
        if (elementPosition < screenPosition) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }
    });
}

// Set initial state for animated elements
document.querySelectorAll('.service-card, .team-card, .pricing-card, .testimonial-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
});



window.addEventListener('scroll', animateOnScroll);
window.addEventListener('load', animateOnScroll);

// Save form data in case of accidental refresh
function saveFormData(formId) {
    const form = document.getElementById(formId);
    const formData = new FormData(form);
    const data = {};
    
    formData.forEach((value, key) => {
        data[key] = value;
    });
    
    localStorage.setItem(`formData_${formId}`, JSON.stringify(data));
}

function loadFormData(formId) {
    const savedData = localStorage.getItem(`formData_${formId}`);
    if (savedData) {
        const data = JSON.parse(savedData);
        const form = document.getElementById(formId);
        
        Object.keys(data).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) input.value = data[key];
        });
    }
}

// ===== Initialize Functions =====
function init() {
    // Check if current page has a gallery and initialize
    if (galleryImages.length > 0) {
        filterGallery('all');
    }
    // Initialize mobile menu toggle
    initMobileMenu();

    // Add loaded class to body for transitions
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);