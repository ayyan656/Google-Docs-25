import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import socket from "../socket/socket";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { IoArrowBackCircle } from "react-icons/io5";

const Editor = () => {
  const { id } = useParams();
  const [value, setValue] = useState("");
  const [title, setTitle] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const quillRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("userInfo"));

  const navigate = useNavigate();

  // Handle Ctrl+S or Cmd+S save shortcut
  useEffect(() => {
    const handleSaveShortcut = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault(); // stop browser save dialog
        toast.info("Saving document...");
        saveContent();
      }
    };

    window.addEventListener("keydown", handleSaveShortcut);
    return () => window.removeEventListener("keydown", handleSaveShortcut);
  }, []);

  // Load document
  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/docs/${id}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setValue(res.data.content || "");
        setTitle(res.data.title || "");
      } catch (err) {
        toast.error("Failed to load document");
      }
    };
    fetchDoc();
  }, [id]);

  // Save content with debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      saveContent();
    }, 2000);
    return () => clearTimeout(timeout);
  }, [value]);

  // Save title with debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      saveTitle();
    }, 1000);
    return () => clearTimeout(timeout);
  }, [title]);

  const saveContent = async () => {
    try {
      await axios.put(
        `http://localhost:5000/api/docs/${id}`,
        { content: value },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
    } catch (err) {
      toast.error("Failed to save document content");
    }
  };

  const saveTitle = async () => {
    try {
      await axios.put(
        `http://localhost:5000/api/docs/${id}`,
        { title },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
    } catch (err) {
      toast.error("Failed to update title");
    }
  };

  // Setup socket connection
  useEffect(() => {
    socket.emit("join-document", id);
    socket.on("receive-changes", (delta) => {
      quillRef.current?.getEditor().updateContents(delta);
    });
    return () => {
      socket.off("receive-changes");
    };
  }, [id]);

  const handleChange = (content, delta, source) => {
    setValue(content);
    if (source === "user") {
      socket.emit("send-changes", { documentId: id, delta });
    }
  };

  // Share document
  const handleShare = async () => {
    if (!shareEmail) return toast.error("Please enter an email");

    try {
      await axios.post(
        `http://localhost:5000/api/docs/${id}/share`,
        {
          email: shareEmail,
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );

      await axios.post(`http://localhost:5000/api/docs/${id}/share-email`, {
        email: shareEmail,
      });

      toast.success("Document shared and email sent!");
      setShareEmail("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to share document");
    }
  };

  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "900px",
        margin: "0 auto",
        fontFamily: "Segoe UI, sans-serif",
      }}
    >
      {/* Back Button */}
      <div
        onClick={() => navigate("/")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          cursor: "pointer",
          marginBottom: "20px",
        }}
      >
        <IoArrowBackCircle />
        <span style={{ fontSize: "16px", color: "#3182ce", fontWeight: "700" }}>
          Back to Home
        </span>
      </div>

      <h1
        style={{
          fontSize: "28px",
          marginBottom: "25px",
          fontWeight: "600",
          color: "#333",
        }}
      >
        📝 Real-Time Collaborative Document Editor
      </h1>

      {/* Document Title */}
      <div style={{ marginBottom: "20px" }}>
        <label
          style={{ display: "block", marginBottom: "6px", fontWeight: "500" }}
        >
          Document Title
        </label>
        <input
          type="text"
          placeholder="Enter Document Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            padding: "6px 14px",
            width: "30%",
            fontSize: "16px",
            borderRadius: "8px",
            border: "1px solid #ccc",
          }}
        />
      </div>

      {/* Share Link and Email Input */}
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "20px",
          marginBottom: "25px",
          backgroundColor: "#f9f9f9",
        }}
      >
        <h3
          style={{ fontSize: "20px", fontWeight: "600", marginBottom: "15px" }}
        >
          🔗 Share Document
        </h3>

        <div style={{ marginBottom: "15px" }}>
          <strong>Document Link:</strong>
          <div
            style={{
              backgroundColor: "#fff",
              padding: "10px 15px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              marginTop: "5px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "14px", overflowWrap: "anywhere" }}>
              http://localhost:3000/editors/{id}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `http://localhost:3000/editor/${id}`
                );
                toast.success("Link copied to clipboard!");
              }}
              style={{
                padding: "6px 10px",
                fontSize: "13px",
                borderRadius: "5px",
                border: "none",
                backgroundColor: "#3182ce",
                color: "white",
                cursor: "pointer",
                marginLeft: "10px",
              }}
            >
              Copy
            </button>
          </div>
        </div>

        <div>
          <label
            style={{ display: "block", marginBottom: "6px", fontWeight: "500" }}
          >
            Share via Email
          </label>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="email"
              placeholder="Enter recipient's email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                fontSize: "14px",
              }}
            />
            <button
              onClick={handleShare}
              style={{
                padding: "10px 16px",
                border: "none",
                borderRadius: "8px",
                backgroundColor: "#38a169",
                color: "#fff",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              Share Access
            </button>
          </div>
        </div>
      </div>

      {/* React Quill Editor */}
      <ReactQuill
        theme="snow"
        value={value}
        onChange={handleChange}
        ref={quillRef}
        style={{
          height: "400px",
          marginBottom: "40px",
          backgroundColor: "#fff",
          borderRadius: "10px",
        }}
      />
    </div>
  );
};

export default Editor;
