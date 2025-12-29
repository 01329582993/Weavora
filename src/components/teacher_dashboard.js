// components/teacher_dashboard.js - Fixed Layout Structure
import React, { useEffect, useState, useRef } from "react";
import { auth, db, storage } from "./firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-toastify";
import CreateClassModal from "./CreateClassModal";
import AIToolsModal from "./AIToolsModal";
import "./teacher_dashboard.css";

function TeacherDashboard() {
  const [userDetails, setUserDetails] = useState(null);
  const [classes, setClasses] = useState([]);
  const [pendingGrading, setPendingGrading] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showAIToolsModal, setShowAIToolsModal] = useState(false);
  const [selectedAITool, setSelectedAITool] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: ""
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchUserData();
    fetchTeacherClasses();
    
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchUserData = async () => {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        const docRef = doc(db, "Users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setUserDetails(userData);
          setEditForm({
            firstName: userData.firstName || "",
            lastName: userData.lastName || "",
            email: userData.email || ""
          });
          
          if (userData.role !== "teacher") {
            toast.error("Access Denied: Teachers only");
            window.location.href = "/login";
          }
        }
      } else {
        window.location.href = "/login";
      }
    });
  };

  const fetchTeacherClasses = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const classesQuery = query(
        collection(db, "classes"),
        where("teacherId", "==", user.uid)
      );
      
      const querySnapshot = await getDocs(classesQuery);
      const classesData = [];
      
      querySnapshot.forEach((doc) => {
        classesData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setClasses(classesData);
      setPendingGrading(0);
      
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast.error("Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      const user = auth.currentUser;
      const photoRef = ref(storage, `profile-photos/${user.uid}`);
      
      await uploadBytes(photoRef, file);
      const photoURL = await getDownloadURL(photoRef);
      
      await updateDoc(doc(db, "Users", user.uid), {
        photo: photoURL
      });
      
      setUserDetails({ ...userDetails, photo: photoURL });
      toast.success("Profile photo updated!");
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    try {
      const user = auth.currentUser;
      await updateDoc(doc(db, "Users", user.uid), {
        firstName: editForm.firstName,
        lastName: editForm.lastName
      });
      
      setUserDetails({
        ...userDetails,
        firstName: editForm.firstName,
        lastName: editForm.lastName
      });
      
      setShowEditProfile(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      window.location.href = "/login";
    } catch (error) {
      console.error("Error logging out:", error.message);
      toast.error("Failed to logout");
    }
  };

  const handleOpenAITool = (toolName) => {
    setSelectedAITool(toolName);
    setShowAIToolsModal(true);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <a href="/" className="sidebar-brand">
            <div className="brand-icon">
              <i className="bi bi-mortarboard-fill"></i>
            </div>
            <div className="brand-text">
              <h2>Weavora</h2>
              <p>AI Classroom</p>
            </div>
          </a>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <button className="nav-item active">
              <i className="bi bi-grid-fill"></i>
              <span>Dashboard</span>
            </button>
            <button className="nav-item">
              <i className="bi bi-book"></i>
              <span>Courses</span>
            </button>
            <button className="nav-item" onClick={() => handleOpenAITool('chatbot')}>
              <i className="bi bi-robot"></i>
              <span>AI Assistant</span>
              <span className="nav-badge">3</span>
            </button>
            <button className="nav-item">
              <i className="bi bi-folder"></i>
              <span>Materials</span>
            </button>
            <button className="nav-item">
              <i className="bi bi-calendar3"></i>
              <span>Schedule</span>
            </button>
            <button className="nav-item">
              <i className="bi bi-megaphone"></i>
              <span>Announcements</span>
              <span className="nav-badge">2</span>
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" onClick={() => setShowEditProfile(true)}>
            <i className="bi bi-person-circle"></i>
            <span>Profile</span>
          </button>
          <button className="nav-item">
            <i className="bi bi-gear"></i>
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Navbar */}
        <nav className="dashboard-navbar">
          <div className="navbar-left">
            <h3>Teacher Dashboard</h3>
          </div>
          <div className="navbar-right">
            <div className="search-bar">
              <i className="bi bi-search"></i>
              <input type="text" placeholder="Search materials, assignments..." />
            </div>
            
            {userDetails && (
              <div className="navbar-user">
                <div className="profile-dropdown-container" ref={dropdownRef}>
                  <button 
                    className="profile-btn"
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  >
                    {userDetails.photo ? (
                      <img 
                        src={userDetails.photo} 
                        alt="Profile" 
                        className="profile-avatar"
                      />
                    ) : (
                      <div className="profile-avatar-placeholder">
                        {userDetails.firstName?.charAt(0)}{userDetails.lastName?.charAt(0)}
                      </div>
                    )}
                  </button>

                  {showProfileDropdown && (
                    <div className="profile-dropdown-menu">
                      <div className="dropdown-header">
                        <div className="dropdown-user-info">
                          {userDetails.photo ? (
                            <img 
                              src={userDetails.photo} 
                              alt="Profile" 
                              className="dropdown-avatar"
                            />
                          ) : (
                            <div className="dropdown-avatar-placeholder">
                              {userDetails.firstName?.charAt(0)}{userDetails.lastName?.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h4>{userDetails.firstName} {userDetails.lastName}</h4>
                            <p>{userDetails.email}</p>
                            <span className="role-badge">Teacher</span>
                          </div>
                        </div>
                      </div>

                      <div className="dropdown-divider"></div>

                      <button 
                        className="dropdown-item"
                        onClick={() => {
                          setShowEditProfile(true);
                          setShowProfileDropdown(false);
                        }}
                      >
                        <i className="bi bi-person-circle"></i>
                        Edit Profile
                      </button>

                      <button className="dropdown-item">
                        <i className="bi bi-gear"></i>
                        Settings
                      </button>

                      <button className="dropdown-item">
                        <i className="bi bi-question-circle"></i>
                        Help & Support
                      </button>

                      <div className="dropdown-divider"></div>

                      <button 
                        className="dropdown-item danger"
                        onClick={handleLogout}
                      >
                        <i className="bi bi-box-arrow-right"></i>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Content Area */}
        <div className="dashboard-content">
          {/* Overview Cards */}
          <div className="overview-cards">
            <div className="overview-card primary">
              <div className="card-icon">
                <i className="bi bi-book"></i>
              </div>
              <div className="card-content">
                <h4>{classes.length}</h4>
                <p>Total Classes</p>
              </div>
            </div>

            <div className="overview-card warning">
              <div className="card-icon">
                <i className="bi bi-pencil-square"></i>
              </div>
              <div className="card-content">
                <h4>{pendingGrading}</h4>
                <p>Pending Grading</p>
              </div>
            </div>

            <div className="overview-card success">
              <div className="card-icon">
                <i className="bi bi-people"></i>
              </div>
              <div className="card-content">
                <h4>
                  {classes.reduce((total, cls) => total + (cls.students?.length || 0), 0)}
                </h4>
                <p>Total Students</p>
              </div>
            </div>
          </div>

          {/* AI Tools Section */}
          <div className="section-header">
            <h4>
              <i className="bi bi-magic"></i> AI-Powered Tools
            </h4>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateClassModal(true)}
            >
              <i className="bi bi-plus-circle"></i> Create New Class
            </button>
          </div>

          <div className="ai-tools-grid">
            <div 
              className="ai-tool-card"
              onClick={() => handleOpenAITool('grading')}
            >
              <div className="tool-icon grading">
                <i className="bi bi-clipboard-check"></i>
              </div>
              <h5>AI Auto-Grading</h5>
              <p>Automatic evaluation of assignments with smart marking suggestions</p>
              <span className="tool-badge">ADVANCED</span>
            </div>

            <div 
              className="ai-tool-card"
              onClick={() => handleOpenAITool('tutor')}
            >
              <div className="tool-icon tutor">
                <i className="bi bi-chat-dots"></i>
              </div>
              <h5>Course AI Tutor</h5>
              <p>RAG-based AI assistant trained on your course materials</p>
              <span className="tool-badge">POPULAR</span>
            </div>

            <div 
              className="ai-tool-card"
              onClick={() => handleOpenAITool('explainer')}
            >
              <div className="tool-icon explainer">
                <i className="bi bi-lightbulb"></i>
              </div>
              <h5>AI Lecture Explainer</h5>
              <p>Generate simplified summaries and explanations of lectures</p>
              <span className="tool-badge">NEW</span>
            </div>

            <div 
              className="ai-tool-card"
              onClick={() => handleOpenAITool('analyzer')}
            >
              <div className="tool-icon analyzer">
                <i className="bi bi-graph-up-arrow"></i>
              </div>
              <h5>Pass-Paper Analyzer</h5>
              <p>Analyze exam patterns and generate study recommendations</p>
              <span className="tool-badge">INSIGHT</span>
            </div>

            <div 
              className="ai-tool-card"
              onClick={() => handleOpenAITool('summarizer')}
            >
              <div className="tool-icon summarizer">
                <i className="bi bi-mic"></i>
              </div>
              <h5>Meeting Summarizer</h5>
              <p>Transcribe and summarize lecture recordings automatically</p>
              <span className="tool-badge">VOICE AI</span>
            </div>

            <div 
              className="ai-tool-card"
              onClick={() => handleOpenAITool('chatbot')}
            >
              <div className="tool-icon chatbot">
                <i className="bi bi-robot"></i>
              </div>
              <h5>AI Teaching Assistant</h5>
              <p>24/7 AI assistant for course queries and help</p>
              <span className="tool-badge">24/7</span>
            </div>
          </div>

          {/* Classes Section */}
          <div className="classes-section">
            <div className="section-header">
              <h4>My Classes</h4>
            </div>
            
            {classes.length === 0 ? (
              <div className="no-classes">
                <i className="bi bi-inbox"></i>
                <p>No classes yet. Create your first class to get started!</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowCreateClassModal(true)}
                >
                  <i className="bi bi-plus-circle"></i> Create Class
                </button>
              </div>
            ) : (
              <div className="classes-grid">
                {classes.map((classItem) => (
                  <div key={classItem.id} className="class-card">
                    <div className="class-thumbnail">
                      {classItem.thumbnail ? (
                        <img src={classItem.thumbnail} alt={classItem.name} />
                      ) : (
                        <div className="default-thumbnail">
                          {classItem.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    
                    <div className="class-info">
                      <h5>{classItem.name}</h5>
                      <p className="class-description">{classItem.description}</p>
                      <p className="class-meta">
                        <span>
                          <i className="bi bi-people"></i> 
                          {classItem.students?.length || 0} students
                        </span>
                        <span>
                          <i className="bi bi-code-square"></i> 
                          {classItem.code}
                        </span>
                      </p>
                    </div>
                    
                    <div className="class-actions">
                      <button className="btn btn-primary">
                        <i className="bi bi-box-arrow-in-right"></i> Enter Class
                      </button>
                      <button className="btn btn-outline-secondary">
                        <i className="bi bi-three-dots-vertical"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="modal-overlay" onClick={() => setShowEditProfile(false)}>
          <div className="edit-profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="bi bi-person-circle"></i> Edit Profile
              </h3>
              <button className="close-btn" onClick={() => setShowEditProfile(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleUpdateProfile}>
              <div className="modal-body">
                <div className="profile-photo-section">
                  <div className="current-photo">
                    {userDetails.photo ? (
                      <img src={userDetails.photo} alt="Profile" />
                    ) : (
                      <div className="photo-placeholder">
                        {userDetails.firstName?.charAt(0)}{userDetails.lastName?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="photo-upload">
                    <label htmlFor="photo-upload" className="upload-label">
                      {uploadingPhoto ? (
                        <>
                          <span className="spinner-border spinner-border-sm"></span>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-camera"></i> Change Photo
                        </>
                      )}
                    </label>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                      style={{ display: "none" }}
                    />
                    <small className="text-muted">Max size: 5MB</small>
                  </div>
                </div>

                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Email (Read-only)</label>
                  <input
                    type="email"
                    className="form-control"
                    value={editForm.email}
                    disabled
                  />
                  <small className="text-muted">Email cannot be changed</small>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditProfile(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-check-circle"></i> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateClassModal && (
        <CreateClassModal
          isOpen={showCreateClassModal}
          onClose={() => setShowCreateClassModal(false)}
          onClassCreated={fetchTeacherClasses}
        />
      )}

      {showAIToolsModal && (
        <AIToolsModal
          isOpen={showAIToolsModal}
          onClose={() => setShowAIToolsModal(false)}
          toolType={selectedAITool}
          userDetails={userDetails}
        />
      )}
    </div>
  );
}

export default TeacherDashboard;