use std::sync::Mutex;
use tauri::{Emitter, Manager};

// 앱이 .md 파일 연결로 실행됐을 때(탐색기 더블클릭, "연결 프로그램") 넘어오는 파일 경로.
// 최초 실행에서는 이 상태에, 이미 실행 중인 인스턴스로는 아래 single-instance 콜백에서
// "open-file" 이벤트로 프런트엔드에 전달한다. 두 경로 모두 실제로 문서를 여는 로직은
// 프런트엔드(openRecentFile)가 맡는다 — Rust는 인자를 골라내 전달만 한다.
struct StartupFile(Mutex<Option<String>>);

// argv[0]은 실행 파일 경로이므로 건너뛰고, `-`로 시작하는 플래그가 아닌 첫 인자를 파일 경로로 본다.
fn extract_file_arg(args: impl IntoIterator<Item = String>) -> Option<String> {
  args.into_iter().skip(1).find(|arg| !arg.starts_with('-'))
}

#[tauri::command]
fn take_startup_file(state: tauri::State<StartupFile>) -> Option<String> {
  state.0.lock().unwrap().take()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let mut builder = tauri::Builder::default();

  // single-instance는 데스크탑 전용이며, 문서에 따르면 다른 플러그인보다 먼저 등록해야 한다.
  // 두 번째 인스턴스가 (다른 .md 파일과 함께) 실행되면 여기로 인자가 전달되고, 새 창을 띄우는 대신
  // 기존 창에 파일을 열고 포커스를 옮긴다.
  #[cfg(desktop)]
  {
    builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_focus();
      }
      if let Some(path) = extract_file_arg(argv) {
        let _ = app.emit("open-file", path);
      }
    }));
  }

  builder
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .manage(StartupFile(Mutex::new(extract_file_arg(std::env::args()))))
    .invoke_handler(tauri::generate_handler![take_startup_file])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
  use super::extract_file_arg;

  #[test]
  fn skips_the_executable_path_and_finds_the_first_non_flag_argument() {
    let args = ["markwiz.exe", r"C:\docs\note.md"].map(String::from);
    assert_eq!(extract_file_arg(args), Some(r"C:\docs\note.md".to_string()));
  }

  #[test]
  fn ignores_flags_before_the_file_path() {
    let args = ["markwiz.exe", "--flag", "-x", r"C:\docs\note.md"].map(String::from);
    assert_eq!(extract_file_arg(args), Some(r"C:\docs\note.md".to_string()));
  }

  #[test]
  fn returns_none_when_launched_with_no_file() {
    let args = ["markwiz.exe".to_string()];
    assert_eq!(extract_file_arg(args), None);

    let args = ["markwiz.exe", "--flag"].map(String::from);
    assert_eq!(extract_file_arg(args), None);
  }
}
