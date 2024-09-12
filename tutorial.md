<walkthrough-metadata>
  <meta name="title" content="PFE Jissen" />
  <meta name="description" content="Hands-on Platform Engineering with Cloud Run" />
  <meta name="component_id" content="110" />
</walkthrough-metadata>

<walkthrough-disable-features toc></walkthrough-disable-features>

# Platform Engineering Handson Cloud Run 編

## Google Cloud プロジェクトの設定、確認

### **1. 対象の Google Cloud プロジェクトを設定**

ハンズオンを行う Google Cloud プロジェクトのプロジェクト ID を環境変数に設定し、以降の手順で利用できるようにします。

```bash
export PROJECT_ID=$(gcloud config get-value project)
```

## **環境準備**

<walkthrough-tutorial-duration duration=10></walkthrough-tutorial-duration>

最初に、ハンズオンを進めるための環境準備を行います。

下記の設定を進めていきます。

- gcloud コマンドラインツール設定
- Google Cloud 機能（API）有効化設定

## **gcloud コマンドラインツール**

Google Cloud は、コマンドライン（CLI）、GUI から操作が可能です。ハンズオンでは主に CLI を使い作業を行いますが、GUI で確認する URL も合わせて掲載します。

### **1. gcloud コマンドラインツールとは?**

gcloud コマンドライン インターフェースは、Google Cloud でメインとなる CLI ツールです。このツールを使用すると、コマンドラインから、またはスクリプトや他の自動化により、多くの一般的なプラットフォーム タスクを実行できます。

たとえば、gcloud CLI を使用して、以下のようなものを作成、管理できます。

- Google Compute Engine 仮想マシン
- Google Kubernetes Engine クラスタ
- Google Cloud SQL インスタンス

**ヒント**: gcloud コマンドラインツールについての詳細は[こちら](https://cloud.google.com/sdk/gcloud?hl=ja)をご参照ください。

### **2. gcloud から利用する Google Cloud のデフォルトプロジェクトを設定**

gcloud コマンドでは操作の対象とするプロジェクトの設定が必要です。操作対象のプロジェクトを設定します。

```bash
gcloud config set project ${PROJECT_ID}
```

承認するかどうかを聞かれるメッセージがでた場合は、`承認` ボタンをクリックします。

### **3. ハンズオンで利用する Google Cloud の API を有効化する**

Google Cloud では利用したい機能ごとに、有効化を行う必要があります。
ここでは、以降のハンズオンで利用する機能を事前に有効化しておきます。（4,5分ほどかかります）
〜finished successfully というメッセージが出たら正常に終了しています。

```bash
gcloud services enable cloudbuild.googleapis.com container.googleapis.com artifactregistry.googleapis.com clouddeploy.googleapis.com workstations.googleapis.com run.googleapis.com
```

**GUI**: [API ライブラリ](https://console.cloud.google.com/apis/library?project={{project-id}})

## **4. gcloud コマンドラインツール設定 - リージョン、ゾーン**

コンピュートリソースを作成するデフォルトのリージョン、ゾーンとして、東京 (asia-northeast1/asia-northeast1-c）を指定します。

```bash
gcloud config set compute/region asia-northeast1 && gcloud config set compute/zone asia-northeast1-c
```

## **参考: Cloud Shell の接続が途切れてしまったときは?**

一定時間非アクティブ状態になる、またはブラウザが固まってしまったなどで `Cloud Shell` が切れてしまう、またはブラウザのリロードが必要になる場合があります。その場合は以下の対応を行い、チュートリアルを再開してください。

### **01. チュートリアル資材があるディレクトリに移動する**

```bash
cd ~/pfe-handson-run
```

### **02. チュートリアルを開く**

```bash
teachme tutorial.md
```

### **03. プロジェクト ID を設定する**

ハンズオンを行う Google Cloud プロジェクトのプロジェクト ID を環境変数に設定し、以降の手順で利用できるようにします。

```bash
export PROJECT_ID=$(gcloud config get-value project)
```

### **4. gcloud のデフォルト設定**

```bash
gcloud config set project ${PROJECT_ID} && gcloud config set compute/region asia-northeast1 && gcloud config set compute/zone asia-northeast1-c
```


## **Lab-00.Lab 向けクラスタの準備**
<walkthrough-tutorial-duration duration=20></walkthrough-tutorial-duration>


### **Lab-00-01. VPC の作成**

今回の Lab 用 VPC を作成します。

```bash
gcloud compute networks create ws-network \
  --subnet-mode custom
```

### **Lab-00-02. サブネットの作成**

作成した VPC にサブネットを作成します。

```bash
gcloud compute networks subnets create ws-subnet \
  --network ws-network \
  --region asia-northeast1 \
  --range "192.168.1.0/24"
```

### **Lab-00-03. Cloud Router の作成**

Cloud NAT を設定するため、Cloud Router を作成しておきます。


```bash
gcloud compute routers create \
  ws-router \
  --network ws-network \
  --region asia-northeast1
```

### **Lab-00-04. Cloud NAT の作成**

GKE Cluster や Cloud Workstations は外部 IP を持たせない設定となるため、Cloud NAT を設定しておきます。

```bash
gcloud compute routers nats create ws-nat \
  --router ws-router \
  --auto-allocate-nat-external-ips \
  --nat-all-subnet-ip-ranges \
  --region asia-northeast1
```

### **Lab-00-05. WS クラスタ の作成**

Cloud Workstations 用のクラスタを作成します。
この作業は同一のリージョンで一度だけ必要で、作成完了まで 25 分程度かかります。

```bash
gcloud workstations clusters create cluster-handson \
  --network "projects/$PROJECT_ID/global/networks/ws-network" \
  --subnetwork "projects/$PROJECT_ID/regions/asia-northeast1/subnetworks/ws-subnet" \
  --region asia-northeast1 \
  --async
```

以上で事前準備は完了です。

## **Lab-01. Cloud Workstations による Golden Path の提供**
Platform Engineering の観点から、開発者に作成ずみの開発環境とサンプルとなるアプリケーションのテンプレートを提供します。
また、Platform 利用者に立場に立って、アプリケーションのデプロイを試してみます。

### **Lab-01-01. Artifact Registry 作成**
Cloud Workstations イメージを保管するためにレポジトリを作成します。

```bash
gcloud artifacts repositories create ws-repo \
  --repository-format docker \
  --location asia-northeast1 \
  --description="Docker repository for Cloud workstations"
```

### **Lab-01-02. Cloud Workstations コンテナイメージの作成**

開発者がサンプルコードを起動するためのライブラリや Code OSS 拡張機能を事前に有効化したイメージを作成します。
今回はあらかじめ用意したサンプルコードを利用します。中身は以下で確認できます。

```bash
cat lab-01/workstations/Dockerfile
```
Cloud Build を利用して、Cloud Workstations コンテナイメージをビルドします。
(赤字でメッセージが出ることがありますが、問題ございません。)

```bash
gcloud builds submit lab-01/workstations/ \
  --tag asia-northeast1-docker.pkg.dev/${PROJECT_ID}/ws-repo/codeoss-node:v1
```

### **Lab-01-03. Cloud Workstations イメージ Pull 用のサービスアカウントの設定**

プライベートなカスタムイメージを利用するため、Artifact Registry から Pull できる権限を持つサービスアカウントを作成しておきます。

```bash
gcloud iam service-accounts create codeoss-customized-sa \
  --display-name "Service Account for codeoss-customized config"
```
サービスアカウントに権限を付与しておきます。今回は、Artifact Registry から Pull できる権限で十分なため、`artifactregistry.reader`を付与します。


```bash
gcloud artifacts repositories add-iam-policy-binding ws-repo \
  --location asia-northeast1 \
  --member serviceAccount:codeoss-customized-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/artifactregistry.reader
```

### **Lab-01-04. Cloud Workstations 構成の作成**

開発者むけにカスタマイズしたコンテナイメージを利用して Cloud Workstations の構成を作成します。

```bash
gcloud workstations configs create codeoss-node \
  --machine-type e2-standard-4 \
  --pd-disk-size 200 \
  --pd-disk-type pd-standard \
  --region asia-northeast1 \
  --cluster cluster-handson \
  --disable-public-ip-addresses \
  --shielded-integrity-monitoring \
  --shielded-secure-boot \
  --shielded-vtpm \
  --service-account codeoss-customized-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --container-custom-image asia-northeast1-docker.pkg.dev/${PROJECT_ID}/ws-repo/codeoss-node:v1
```

### **Lab-01-05. Workstations の作成**

開発者むけに一台、Workstations を作成します。この作業は、通常、開発者ごとに行うことになります。

```bash
gcloud workstations create ws-node-dev \
  --region asia-northeast1 \
  --cluster cluster-handson \
  --config codeoss-node
```
### **Lab-01-06. CI/CD パイプラインの準備**

Platform Engineering の要素の一つとして、デプロイの自動化があります。
プラットフォームの管理者として開発者が簡単にデプロイできるように Cloud Build/Cloud Deploy を使ってパイプラインを構築しておきます。
今回はハンズオンのために準備したファイルを活用してパイプラインを準備します。
各ファイルの中身を確認しておきます。Cloud Build のファイルについては、実際は開発者が Workstation で使うため、ここでは確認のみです。同じファイルが開発者側のレポジトリにも保存されています。

```bash
cat lab-01/cloudbuild.yaml
```

```bash
cat lab-01/clouddeploy.yaml
```

このファイルは`PROJECT_ID`がプレースホルダーになっていますので、各自の環境に合わせて置換します。

```bash
sed -i "s|\${PROJECT_ID}|$PROJECT_ID|g" lab-01/clouddeploy.yaml
```

正しく反映されているか確認します。
```bash
cat lab-01/clouddeploy.yaml
```

まずは、パイプラインとターゲットを Cloud Deploy に登録します。これによりアプリケーションをデプロイするための
Cluster および、dev / prod という順序性が定義されます。

```bash
gcloud deploy apply --file lab-01/clouddeploy.yaml --region=asia-northeast1 --project=$PROJECT_ID
```

デプロイ方法は、`skaffold.yaml`に定義されています。ここには、デプロイに利用するマニフェスト、およびデプロイに対応する成果物が定義されています。

```bash
cat lab-01/skaffold.yaml
```

Artifact Registry に CI で作成する成果物であるコンテナイメージを保管するためのレポジトリを作成しておきます。

```bash
gcloud artifacts repositories create app-repo \
  --repository-format docker \
  --location asia-northeast1 \
  --description="Docker repository for Platform users"
```
Cloud Build から Cloud Deploy を利用するにあたっていくつか権限が必要になるため、サービスアカウントに付与します。

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
```
```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/clouddeploy.admin"
```

```bash
gcloud iam service-accounts add-iam-policy-binding $COMPUTE_SA \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/iam.serviceAccountUser" \
    --project=$PROJECT_ID
```


以上で、プラットフォーム管理者としての作業は終わりました。
続いて実際にプラットフォームを利用する開発者としての体験をしてみます。

## **Lab-02. Golden Path を利用した開発体験**

### **Lab-02-01. Workstations の起動**
開発者はまず、自分の Workstations を起動することになります。
GUI での作業となります。
ブラウザで新しいタブを開き、[Workstations一覧](https://console.cloud.google.com/workstations/list)を開きます。
**My workstations** に表示される `ws-spring-dev`の 起動 をクリックします。
起動には数分程度かかります。
ステータスが、稼働中になりましたら、開始をクリックします。新しいタブで Code OSS の Welcome 画面が開きます。初回は表示に少し時間がかかります。

### **Lab-02-02. レポジトリのフォーク**
サンプルアプリケーションのレポジトリを自身のレポジトリへフォークします。
ウェブブラウザの URL バーに `https://github.com/ssekimoto/gs-spring-boot` を入力して移動します。
移動先で画面上部の Fork をクリックします。その後任意の名前のレポジトリにフォークします。


### **Lab-02-03. サンプルアプリケーションの入手**
git よりサンプルアプリケーションを取得します。
左側の2番目のアイコンをクリック、または、Ctrl + Shift + E の入力で、EXPLORER が開きます。
Clone Repository を選択します。

上部に開いた URL バーに `https://github.com/[username]/gs-spring-boot.git`と入力します。
入力後、`レポジトリの URL https://github.com/[username]/gs-spring-boot.git`をクリックします。
(Github から複製を選択してしまうと、Github の認証が必要となりますのでキャンセルしてやり直してください)
複製するフォルダーを選択してください、はそのまま OK をクリックしてください。
続いて 複製したレポジトリを開きますか？または現在のワークスペースに追加しますか？という選択には、`開く(Open)`を選択してください。

### **Lab-02-04. サンプルアプリケーションの実行**
まずは、手元のローカル（Cloud Workstations 自体の中）でアプリケーションをテスト実行してみます。
左上の３本の線のアイコンから、Terminal > New Terminal を選択します。
画面下にターミナルが現れますので、こちらで作業を実施します。

complete ディレクトリに移動します。

```bash
cd complete
```

アプリケーションをビルドします。

```bash
mvn clean install -DskipTests
```

ビルドしたアプリケーションをまずは Workstations 上で実行します。

```bash
java -jar target/spring-boot-complete-0.0.1-SNAPSHOT.jar
```

実行すると 右下に Open Preview という吹き出しが現れるので、クリックします。
続いて、Open をクリックするとシンプルなアプリケーションにアクセスできます。
完了したら、ターミナルに戻り、Ctrl-C でアプリケーションを停止しておきます。

### **Lab-02-5. Cloud Run でのアプリケーションの実行**
引き続き Cloud Workstations で作業をします。
サンプルアプリケーションと一緒に、Dockerfile と先ほどの CI/CD パイプライン用のファイル も Golden Path として git から提供されています。
ここでは、プラットフォーム管理者が作成したパイプラインを利用して、アプリケーションのコンテナ化から、Cloud Run へのデプロイまでを自動化する体験をします。
Workstations 上のターミナルで実行します。もしディレクトリを移動している場合、`complete` へ移動しておきます。

```bash
cd /home/user/gs-spring-boot/complete
```

Workstations 上では Google Cloud にログインに別途ログインする必要があります。

```bash
gcloud auth login
```

表示される URL を Ctrl + クリックで Open、もしくはコピー&ペーストで別のタブで開きます。
すると Google アカウントへのログイン画面になるため、ログインを実施します。
ログインするアカウントは lab 向けに払い出されている student- から始まるものであることに注意してください。
最後に表示される `4/0` から始まる verification code をコピーして、Cloud Workstations の ターミナルに貼り付けます。
正常にログインが完了すると
`You are now logged in as [アカウント]`と表示されます。

また、Cloud Shell と同じように以下設定を行います。

```bash
export PROJECT_ID=[PROJECT_ID(自身のIDに置き換えます[]は不要です)]
```

```bash
gcloud config set project ${PROJECT_ID}
```

CI/CD パイプラインを利用して、コンテナのビルドおよび Cloud Run の 開発環境 へのデプロイを実施します。

### **Lab-02-6. Cloud Build ビルドトリガーの設定**

Cloud Build のコンソール画面からビルドトリガーを設定します。

<walkthrough-menu-navigation sectionId="CLOUD_BUILD_SECTION"></walkthrough-menu-navigation>

<walkthrough-path-nav path="https://console.cloud.google.com/cloud-build" >Cloud Build に移動</walkthrough-path-nav>

Cloud Build で GitHub リポジトリを利用するために、GitHub リポジトリとの連携を設定します。

左のサイドバーよりリポジトリ</walkthrough-spotlight-pointer>メニューに遷移します。

<walkthrough-spotlight-pointer locator="semantic({tab '第 2 世代'})" validationPath="/cloud-build/repositories/2nd-gen">第2世代</walkthrough-spotlight-pointer>のタブを選択して、<walkthrough-spotlight-pointer locator="semantic({button 'ホスト接続を作成'})" validationPath="/cloud-build/repositories/2nd-gen">ホスト接続を作成</walkthrough-spotlight-pointer>より GitHub リポジトリとの接続を行います。
 `[新しいホストに接続]`にて、プロバイダ`[GitHub]`を選択します。
   - リージョン：`asia-northeast1`
   - 名前：`cloudrun-handson`
4. <walkthrough-spotlight-pointer locator="semantic({button '接続'})" validationPath="/cloud-build/connections/create">接続</walkthrough-spotlight-pointer>ボタンを押します。

GitHubのページに遷移をし、Google Cloud Buildに対するPermissionを求められます。
`[Authorize Google Cloud Build]`を押し、許可をします。

Cloud Buildの画面に戻り、`[既存のGitHubインストールの使用]`モーダルが表示されます。
`[インストール]`ボタンを押し、**組織ではなく個人のGitHubアカウント**を選択して `[確認]`を押します。
ホスト接続が作成できたら、次に`[リポジトリをリンク]`を押下します。

先ほど作成したホスト接続を選択し、リポジトリには `pfe-handson-run` を選択して`[リンク]`を押します。

以上でGitHubリポジトリとの接続が完了しました。

### **2. サービスアカウントの作成**

まず、Cloud Buildが利用するサービスアカウントを作成しておきます。

```bash
gcloud iam service-accounts create cnsrun-cloudbuild --display-name "Service Account for Cloud Build in cnsrun"
gcloud projects add-iam-policy-binding ${GOOGLE_CLOUD_PROJECT} \
  --member=serviceAccount:cnsrun-cloudbuild@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com \
  --condition=None \
  --role=roles/cloudbuild.builds.builder
gcloud projects add-iam-policy-binding ${GOOGLE_CLOUD_PROJECT} \
  --member=serviceAccount:cnsrun-cloudbuild@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com \
  --condition=None \
  --role=roles/logging.logWriter
gcloud projects add-iam-policy-binding ${GOOGLE_CLOUD_PROJECT} \
  --member=serviceAccount:cnsrun-cloudbuild@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com \
  --condition=None \
  --role=roles/clouddeploy.releaser
gcloud projects add-iam-policy-binding ${GOOGLE_CLOUD_PROJECT} \
  --member=serviceAccount:cnsrun-cloudbuild@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com \
  --condition=None \
  --role=roles/iam.serviceAccountUser
```

### **3. Cloud Buildの設定**

次に、Cloud Buildの起動対象となる「ソースコードのプッシュ」対象のリポジトリ名を取得します。

```bash
REPO_NAME=$(gcloud beta builds repositories list --connection=cnsrun-app-handson --region=asia-northeast1 --format=json | jq -r .[].name)
```

最後に、Cloud Buildのトリガを作成します。

```bash
gcloud beta builds triggers create github \
--name=cnsrun-frontend-trigger \
--region=asia-northeast1 \
--repository="$REPO_NAME" \
--branch-pattern=^main$ \
--build-config=app/frontend/cloudbuild_push.yaml \
--included-files=app/frontend/** \
--substitutions=_DEPLOY_ENV=main \
--service-account=projects/${GOOGLE_CLOUD_PROJECT}/serviceAccounts/cnsrun-cloudbuild@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com
```

<walkthrough-footnote>第2世代と第1世代でパラメータが微妙に違うので注意が必要です。`--repo-name`や`--repo-owner`は第1世代向けです。https://cloud.google.com/sdk/gcloud/reference/beta/builds/triggers/create/github </walkthrough-footnote>

<walkthrough-spotlight-pointer locator="semantic({link 'トリガー、5/4'})" validationPath="/cloud-build/.*">トリガー</walkthrough-spotlight-pointer>
に遷移をして、作成されていることを確認し、次に進みましょう。

## **Cloud Deploy の設定**

<walkthrough-tutorial-duration duration=10></walkthrough-tutorial-duration>

<walkthrough-enable-apis apis="clouddeploy.googleapis.com"></walkthrough-enable-apis>

まずはコンソールから Cloud Deploy のページに移動します。

<walkthrough-menu-navigation sectionId="CLOUD_DEPLOY_SECTION"></walkthrough-menu-navigation>

見つからない場合は次のリンクから開くか、画面真ん中上部の検索から遷移をしてください。

<walkthrough-path-nav path="https://console.cloud.google.com/deploy" >Cloud Deploy に移動</walkthrough-path-nav>

### **1. サービスアカウントの作成**

まず、Cloud Deployが利用するサービスアカウントを作成しておきます。

```bash
gcloud iam service-accounts create cnsrun-clouddeploy --display-name "Service Account for Cloud Deploy in cnsrun"
gcloud projects add-iam-policy-binding ${GOOGLE_CLOUD_PROJECT} \
  --member=serviceAccount:cnsrun-clouddeploy@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com \
  --condition=None \
  --role=roles/logging.logWriter
gcloud projects add-iam-policy-binding ${GOOGLE_CLOUD_PROJECT} \
  --member=serviceAccount:cnsrun-clouddeploy@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com \
  --condition=None \
  --role=roles/clouddeploy.jobRunner
gcloud projects add-iam-policy-binding ${GOOGLE_CLOUD_PROJECT} \
  --member=serviceAccount:cnsrun-clouddeploy@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com \
  --condition=None \
  --role=roles/iam.serviceAccountUser
gcloud projects add-iam-policy-binding ${GOOGLE_CLOUD_PROJECT} \
  --member=serviceAccount:cnsrun-clouddeploy@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com \
  --condition=None \
  --role=roles/run.developer
gcloud projects add-iam-policy-binding ${GOOGLE_CLOUD_PROJECT} \
  --member=serviceAccount:cnsrun-clouddeploy@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com \
  --condition=None \
  --role=roles/storage.objectUser
```

### **2. デリバリーパイプラインの作成**

Cloud Deployではデリバリーパイプラインを作成し、Cloud Runをデプロイ先ターゲットとする設定を作成します。

```bash
APP_TYPE=frontend
sed -e "s/PROJECT_ID/${GOOGLE_CLOUD_PROJECT}/g" doc/clouddeploy.yml | sed -e "s/REGION/asia-northeast1/g" | sed -e "s/SERVICE_NAME/cnsrun-${APP_TYPE}/g" > /tmp/clouddeploy_${APP_TYPE}.yml
gcloud deploy apply --file=/tmp/clouddeploy_${APP_TYPE}.yml --region asia-northeast1
```
<walkthrough-spotlight-pointer cssSelector="[id=cfctest-section-nav-item-delivery_pipelines]">デリバリーパイプライン</walkthrough-spotlight-pointer>、<walkthrough-spotlight-pointer cssSelector="[id=cfctest-section-nav-item-targets]">デプロイ先ターゲット</walkthrough-spotlight-pointer>の設定が完了したことをコンソールから確認して次に進みましょう。

## **フロントエンドアプリケーションを修正**

<walkthrough-tutorial-duration duration=10></walkthrough-tutorial-duration>

CI/CDがうまく機能をして、アプリケーションへの修正がデプロイされることを確認しましょう。
Cloud Buildに接続したGitHubのリポジトリを開き、`app/frontend/main.go`を開いて`http.HandleFunc("/frontend")`の応答を適当な文字列に変更してみましょう。

```go
-   fmt.Fprintf(w, "Hello cnsrun handson's user:D\n")
+   fmt.Fprintf(w, "Hello first hands-on\n")
```

Cloud RunのYAML設定ファイルの設定も少し変更をします。
次のコマンドを実行してください。

```bash
echo ${GOOGLE_CLOUD_PROJECT}
```

編集ファイルがローカル環境にあり、macOSの場合は次のコマンドで更新もできます。
コマンド実行が難しい場合は、下記のファイルの`PROJECT_ID`を手動で自身のプロジェクトIDに置き換えてください。

- `app/frontend/cloudrun.yaml`
- `app/backend/cloudrun.yaml`
- `app/batch/cloudrun.yaml`

```bash
YOUR_PROJECT_ID=`自身のプロジェクトID`
sed -i -e "s/PROJECT_ID/${YOUR_PROJECT_ID}/g" app/frontend/cloudrun.yaml
sed -i -e "s/PROJECT_ID/${YOUR_PROJECT_ID}/g" app/backend/cloudrun.yaml
sed -i -e "s/PROJECT_ID/${YOUR_PROJECT_ID}/g" app/batch/cloudrun.yaml
```

変更を加えたら、リモートブランチへプッシュをして、Cloud Buildの`[履歴メニュー]`から処理が起動したことを確認します。

```bash
git add app
git commit -m "feat: hands-on step2"
git push origin main
```

ビルド完了まで、おおよそ5分ほどかかります。
ビルドが正常終了したら、再度リクエストを発行して修正が反映されたことを確認しましょう。

```bash
FRONTEND_URL=$(gcloud run services describe cnsrun-frontend --region=asia-northeast1 --format='value(status.url)')
curl -i $FRONTEND_URL/frontend
```



### **Lab-02-11. Cloud Deploy での実行確認と本番環境へのプロモート**

デプロイ中の様子を見るため、GUI で確認していきます。
数分の経過後、[Cloud Deploy コンソール](https://console.cloud.google.com/deploy)に最初のリリースの詳細が表示され、それが最初のクラスタに正常にデプロイされたことが確認できます。

[Cloud Run コンソール](https://console.cloud.google.com/run)に移動して、アプリケーションのエンドポイントを探します。
`サービス`で表示される一覧から `spring-app-service` という名前のサービスを見つけ、クリックします。
画面上部から、`https://php-app-696526553493.asia-northeast1.run.app`
アプリケーションが期待どおりに動作していることを確認します。

ステージングでテストしたので、本番環境に昇格する準備が整いました。
[Cloud Deploy コンソール](https://console.cloud.google.com/deploy)に戻ります。
デリバリーパイプラインの一覧から、`pfe-pipeline` をクリックします。
すると、`プロモート` という青いリンクが表示されています。リンクをクリックし、内容を確認した上で、下部の`プロモート`ボタンをクリックします。すると本番環境へのデプロイを実施されます。

数分後にデプロイが完了されましたら、この手順は完了となります。


### **Lab-01-01 アプリケーションコンテナ保管用レポジトリの作成**

Artifact Registry に CI で作成する成果物であるコンテナイメージを保管するためのレポジトリを作成しておきます。

```bash
gcloud artifacts repositories create app-repo \
  --repository-format docker \
  --location asia-northeast1 \
  --description="Docker repository for python app"
```

### **Lab-01-02 Cloud Build による CI**
Cloud Build を利用してサンプルアプリケーションのソースコードからコンテナイメージをビルドします。
サンプルアプリケーションは Flask を利用した Python のアプリケーションです。

```bash
cat app.py
```

リクエストを受けると、ランダムに犬の品種を JSON 形式で返す API を提供しています。
また、ビルド中のステップとして、静的解析(PEP8)と簡単なユニットテストを実装しています。

```bash
cat cloudbuild.yaml
```

Cloud Build で実行します。今回は Git レポジトリを用意していないため、ローカルのソースコードから手動トリガーとして実行します。

```bash
gcloud builds submit --config cloudbuild.yaml .
```

各ステップが順に行われているのが、出力をみてわかります。
5分ほど正常に完了します。
その後、正しくソースコードがコンテナ化されているのか、Cloud Shell 上でコンテナを動作させて確認します。
まず、以下のコマンドで Cloud Shell に先ほど作成したイメージをダウンロードしてきます。

```bash
docker pull asia-northeast1-docker.pkg.dev/$PROJECT_ID/app-repo/pets:v1
```

続いて、以下のコマンドでCloud Shell 上でコンテナを動作させます。

```bash
 docker run -d -p 5000:5000 asia-northeast1-docker.pkg.dev/$PROJECT_ID/app-repo/pets:v1
```

正しく動作しているか、curl アクセスして確認してみます。JSON 形式でレスポンスがあれば成功です。
```bash
curl http://localhost:5000/random-pets
```

##
### **Lab-01-02 Cloud Deploy によるCD**
続いて、Cloud Deploy を活用して、複数のクラスタに順番にデプロイしていきます。
dev-cluster に対しては、トリガーと共にデプロイがされますが、
prod-cluster に対しては、UI 上でプロモートという操作をするまではデプロイが行われません。

早速そのようなパイプラインを設定していきます。
設定は以下の `clouddeploy.yaml` に記述されています。

```bash
cat clouddeploy.yaml
```

以下のファイルは`PROJECT_ID`がプレースホルダーになっていますので、各自の環境に合わせて置換します。

```bash
sed -i "s|\${PROJECT_ID}|$PROJECT_ID|g" clouddeploy.yaml
```

まずは、パイプラインとターゲットを Cloud Deploy に登録します。これによりアプリケーションをデプロイするための
Cluster および、dev / prod という順序性が定義されます。

```bash
gcloud deploy apply --file clouddeploy.yaml --region=asia-northeast1 --project=$PROJECT_ID
```

続いて、リリースを作成して、実際のデプロイを実行します。
デプロイ方法は、`skaffold.yaml`に定義されています。ここには、デプロイに利用するマニフェスト、およびデプロイに対応する成果物が定義されています。

```bash
cat skaffold.yaml
```

続いて以下のコマンドで実際に GKE の dev-cluster にデプロイします。

```bash
gcloud deploy releases create \
    release-$(date +%Y%m%d%H%M%S) \
    --delivery-pipeline=pfe-cicd \
    --region=asia-northeast1 \
    --project=$PROJECT_ID \
    --images=pets=asia-northeast1-docker.pkg.dev/$PROJECT_ID/app-repo/pets:v1
```

autopilot mode のクラスターのため、初回のデプロイはノードのスケーリングに時間が数分かかります。
デプロイ中の様子を見るため、GUI で確認していきます。
数分の経過後、[Cloud Deploy コンソール](https://console.cloud.google.com/deploy)に最初のリリースの詳細が表示され、それが最初のクラスタに正常にデプロイされたことが確認できます。

[Kubernetes Engine コンソール](https://console.cloud.google.com/kubernetes)に移動して、アプリケーションのエンドポイントを探します。
左側のメニューバーより Gateway、Service、Ingress を選択し`サービス`タブに遷移します。表示される一覧から `pets-service` という名前のサービスを見つけます。
Endpoints 列に IP アドレスが表示され、リンクとなっているため、それをクリックして、IPアドレスの最後に`/random-pets`をつけて移動します。
アプリケーションが期待どおりに動作していることを確認します。

ステージングでテストしたので、本番環境に昇格する準備が整いました。
[Cloud Deploy コンソール](https://console.cloud.google.com/deploy)に戻ります。
デリバリーパイプラインの一覧から、`pfe-cicd` をクリックします。
すると、`プロモート` という青いリンクが表示されています。リンクをクリックし、内容を確認した上で、下部の`プロモート`ボタンをクリックします。すると本番環境へのデプロイを実施されます。

数分後にデプロイが完了されましたら、この手順は完了となります。

## **Lab-01-03 Cloud Build から Cloud Deploy の実行**
ここまでで、CI と CD を別々に行うことができました。
次の手順としては、アプリケーションを更新し、ビルドを実行します。
ビルドの最後の手順として、Cloud Deploy を実行するように設定しておき、一気通貫で CI と CD が実行されるようにします。

まずはアプリケーションを更新します。今回は簡単にするために事前に用意した app.txt を app.py に置き換えることで更新を完了します。

```bash
mv app.py app.bak
```

```bash
mv app.txt app.py
```

必要に応じて更新後のソースコードをご確認ください。

続いて、`cloudbuild.yaml` についても変更を加え、ビルドステップの最後に、Cloud Deploy を実行するように編集する必要があります。
ただし、今回は先ほどと同様に `cloudbuild-2.yaml`というファイルで更新ずみのものを用意しておりますので、こちらを利用します。

```bash
cat cloudbuild-2.yaml
```
確認するとステップが追加されていることがわかります。
Cloud Build から Cloud Deploy を利用するにあたっていくつか権限が必要になるため、サービスアカウントに付与します。

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
```

```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/clouddeploy.admin"
```

```bash
gcloud iam service-accounts add-iam-policy-binding $COMPUTE_SA \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/iam.serviceAccountUser" \
    --project=$PROJECT_ID
```
それでは実行します。

```bash
gcloud builds submit --config cloudbuild-2.yaml .
```
もし、エラーが出てしまいましたら、`app.py`の最終行にある空白行を削除もしくは、改行を行いもう一度、上のコマンドを試してください。
これは PEP8 による構文解析で、空行の有無を判定しているためです。
しばらくすると先ほどの CI のステップが順に行われた後、デリバリーパイプラインでデプロイが開始されるのが確認できます。

デプロイ中の様子を見るため、GUI で確認していきます。
数分の経過後、[Cloud Deploy コンソール](https://console.cloud.google.com/deploy)に今回のリリースの詳細が表示され、それが最初のクラスタに正常にデプロイされたことが確認できます。

[Kubernetes Engine コンソール](https://console.cloud.google.com/kubernetes)に移動して、アプリケーションのエンドポイントを探します。
左側のメニューバーより Gateway、Service、Ingress を選択し`サービス`タブに遷移します。表示される一覧から `pets-service` という名前のサービスを見つけます。
Endpoints 列に IP アドレスが表示され、リンクとなっているため、それをクリックして、IPアドレスの最後に`/random-pets`をつけて移動します。
再びアプリケーションが期待どおりに動作していることを確認します。今回は先ほどとは異なる出力となるのが確認できるようになっています。

ステージングでテストしたので、本番環境に昇格する準備が整いました。
[Cloud Deploy コンソール](https://console.cloud.google.com/deploy)に戻ります。
デリバリーパイプラインの一覧から、`pfe-cicd` をクリックします。
すると、`プロモート` という青いリンクが表示されています。リンクをクリックし、内容を確認した上で、下部の`プロモート`ボタンをクリックします。すると本番環境へのデプロイを実施されます。

数分後にデプロイが完了されましたら、この手順は完了となります。

こちらで Lab-01 は完了となります。

## **Lab-02 GKE Enterprise による チームスコープでの Logging**
GKE Enterprise を有効化すると様々な高度な機能が GKE 上で利用できるようになります。
その一つとしてチーム単位での Logging を本ハンズオンでの対象とします。

### **Lab-02-01.GKE Enterprise の有効化**

```bash
gcloud services enable --project "$PROJECT_ID" \
   anthos.googleapis.com \
   gkehub.googleapis.com \ 
   connectgateway.googleapis.com
```

### **Lab-02-02.GKE Enterprise チーム機能の有効化**

フリートを作成します。フリートは船団という意味で、GKE クラスタの論理的なグループです。

```bash
  gcloud container fleet create \
    --project "$PROJECT_ID"
```

作成したフリートに dev-cluster を登録しておきます。

```bash
gcloud container clusters update dev-cluster --enable-fleet --location asia-northeast1
```

同様に Prod Cluster も登録します。

```bash
gcloud container clusters update prod-cluster --enable-fleet --location asia-northeast1
```
### **Lab-02-03.GKE Enterprise チームスコープの作成**

フリートの中にチームスコープを作成します。チームスコープは複数クラスタにまたがる開発チームが利用する範囲とメンバーなどを定義するリソースです。
```bash
gcloud container fleet scopes create app-a-team
```

### **Lab-02-04. チームスコープへのクラスタの登録**

ここからは GUI で操作します。
ブラウザ上の別のタブを開き（または同タブにURLを入力して）[チーム](https://console.cloud.google.com/kubernetes/teams)へ移動します。
チームのページより、チーム名 `app-a-team` がリンクになっているためクリックします。
続いて、ページ上部の` + クラスタを追加` をクリックします。
`すべて選択` にチェックを入れ `OK` を押します。
`チームスコープを更新`をクリックします。

### **Lab-02-05. 名前空間の追加**

チーム機能では、複数クラスタにまたがる名前空間を作成することが可能です。
ページ上部の` + 名前空間を追加` をクリックします。

Namespace の下に 'app-a-team-ns' を入力して、`チームスコープを更新`をクリックします。

### **Lab-02-06. チームスコープ内の名前空間へのアプリケーションのデプロイ**

再び、Cloud Shell での作業となります。
以下のコマンドでdev-cluster に対して接続します。

```bash
gcloud container clusters get-credentials dev-cluster --region asia-northeast1 --project "$PROJECT_ID"
```

以下のコマンドを実行し、サンプルアプリケーションをデプロイします。
**こちらはコピーアンドペーストで実行ください**
```text
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: fleet-example-pod
  namespace: app-a-team-ns
spec:
  containers:
  - name: count
    image: ubuntu:14.04
    args: [bash, -c,
        'for ((i = 0; ; i++)); do echo "$i: $(date)"; sleep 1; done']
EOF
```

### **Lab-02-07. Fleet Logging の設定**
以下コマンドを実行し、Fleet Logging の構成ファイルを生成します。  
**こちらはコピーアンドペーストで実行ください**

```text
cat << EOF > fleet-logging.json
{
  "loggingConfig": {
      "defaultConfig": {
          "mode": "COPY"
      },
      "fleetScopeLogsConfig": {
          "mode": "MOVE"
      }
  }
}
EOF
```

生成した構成ファイルを指定し、Fleet Logging を有効化します。  
```bash
gcloud container fleet fleetobservability update \
        --logging-config=fleet-logging.json
```

以下コマンドを実行し、Fleet Logging が構成されていることを確認します。
```bash
gcloud container fleet fleetobservability describe
```

以下のように出力例 spec.fleetobservability 配下に設定内容が入力されていることを確認します。  
```text
createTime: '2022-09-30T16:05:02.222568564Z'
membershipStates:
  projects/123456/locations/us-central1/memberships/cluster-1:
    state:
      code: OK
      description: Fleet monitoring enabled.
      updateTime: '2023-04-03T20:22:51.436047872Z'
name:
projects/123456/locations/global/features/fleetobservability
resourceState:
  state: ACTIVE
spec:
  fleetobservability:
    loggingConfig:
      defaultConfig:
        mode: COPY
      fleetScopeLogsConfig:
        mode: MOVE
```

### **Lab-02-08. チームスコープログの確認**

ここからは GUI で操作します。
ブラウザ上の別のタブを開き（または同タブにURLを入力して）[チーム](https://console.cloud.google.com/kubernetes/teams)へ移動します。  
チームのページより、チーム名 `app-a-team` がリンクになっているためクリックします。  
`ログ`タブを選択し、先ほどデプロイしたアプリケーションから以下のような形式でログが出力されていることを確認します。  
```text
27834: Tue May 28 07:52:37 UTC 2024
27835: Tue May 28 07:52:38 UTC 2024
27836: Tue May 28 07:52:39 UTC 2024
27837: Tue May 28 07:52:40 UTC 2024
27838: Tue May 28 07:52:41 UTC 2024
27839: Tue May 28 07:52:42 UTC 2024
27840: Tue May 28 07:52:43 UTC 2024
27841: Tue May 28 07:52:44 UTC 2024
27842: Tue May 28 07:52:45 UTC 2024
27843: Tue May 28 07:52:46 UTC 2024
```

### **Lab-02-09. チームスコープメトリクスの確認**
チーム管理画面の`モニタリング`タブを選択し、チームスコープ単位でメトリクス情報が閲覧可能であることを確認します。

Lab-02 はこちらで完了になります。


## **Configurations!**
これで、実践編のハンズオンは完了となります。引き続き、セキュリティガードレール編もお楽しみ下さい。

## **クリーンアップ（プロジェクトを削除）**

ハンズオン用に利用したプロジェクトを削除し、コストがかからないようにします。

### **1. Google Cloud のデフォルトプロジェクト設定の削除**

```bash
gcloud config unset project
```

### **2. プロジェクトの削除**

```bash
gcloud projects delete ${PROJECT_ID}
```

### **3. ハンズオン資材の削除**

```bash
cd $HOME && rm -rf gcp-getting-started-lab-jp gopath
```
